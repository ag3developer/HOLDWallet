"""
🏦 System Wallet Model
======================

Wallet do sistema para receber taxas e comissões das operações.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.core.db import Base
import enum


class FeeType(str, enum.Enum):
    """Tipos de taxa"""
    P2P_COMMISSION = "p2p_commission"
    OTC_SPREAD = "otc_spread"
    NETWORK_FEE = "network_fee"
    WITHDRAWAL_FEE = "withdrawal_fee"
    INSTANT_TRADE = "instant_trade"


class FeeStatus(str, enum.Enum):
    """Status da taxa"""
    COLLECTED = "collected"
    PENDING = "pending"
    REFUNDED = "refunded"


class SystemWallet(Base):
    """
    Wallet do sistema para armazenar taxas/comissões coletadas.
    
    Mantém saldos separados por criptomoeda.
    """
    __tablename__ = "system_wallets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False, default="holdwallet_main")
    description = Column(Text, nullable=True)
    
    # Saldos por criptomoeda
    btc_balance = Column(Float, default=0.0, nullable=False)
    eth_balance = Column(Float, default=0.0, nullable=False)
    usdt_balance = Column(Float, default=0.0, nullable=False)
    usdc_balance = Column(Float, default=0.0, nullable=False)
    brl_balance = Column(Float, default=0.0, nullable=False)
    matic_balance = Column(Float, default=0.0, nullable=False)
    bnb_balance = Column(Float, default=0.0, nullable=False)
    trx_balance = Column(Float, default=0.0, nullable=False)
    sol_balance = Column(Float, default=0.0, nullable=False)
    
    # Totais acumulados (histórico)
    total_btc_collected = Column(Float, default=0.0, nullable=False)
    total_eth_collected = Column(Float, default=0.0, nullable=False)
    total_usdt_collected = Column(Float, default=0.0, nullable=False)
    total_brl_collected = Column(Float, default=0.0, nullable=False)
    
    # Metadata
    is_active = Column(String(10), default="true")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_balance(self, cryptocurrency: str) -> float:
        """Retorna saldo de uma criptomoeda específica"""
        crypto_map = {
            "BTC": self.btc_balance,
            "ETH": self.eth_balance,
            "USDT": self.usdt_balance,
            "USDC": self.usdc_balance,
            "BRL": self.brl_balance,
            "MATIC": self.matic_balance,
            "BNB": self.bnb_balance,
            "TRX": self.trx_balance,
            "SOL": self.sol_balance,
        }
        return crypto_map.get(cryptocurrency.upper(), 0.0)
    
    def add_balance(self, cryptocurrency: str, amount: float):
        """Adiciona saldo a uma criptomoeda"""
        crypto = cryptocurrency.upper()
        if crypto == "BTC":
            self.btc_balance += amount
            self.total_btc_collected += amount
        elif crypto == "ETH":
            self.eth_balance += amount
            self.total_eth_collected += amount
        elif crypto == "USDT":
            self.usdt_balance += amount
            self.total_usdt_collected += amount
        elif crypto == "USDC":
            self.usdc_balance += amount
        elif crypto == "BRL":
            self.brl_balance += amount
            self.total_brl_collected += amount
        elif crypto == "MATIC":
            self.matic_balance += amount
        elif crypto == "BNB":
            self.bnb_balance += amount
        elif crypto == "TRX":
            self.trx_balance += amount
        elif crypto == "SOL":
            self.sol_balance += amount
        
        self.updated_at = datetime.utcnow()
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "balances": {
                "BTC": self.btc_balance,
                "ETH": self.eth_balance,
                "USDT": self.usdt_balance,
                "USDC": self.usdc_balance,
                "BRL": self.brl_balance,
                "MATIC": self.matic_balance,
                "BNB": self.bnb_balance,
                "TRX": self.trx_balance,
                "SOL": self.sol_balance,
            },
            "totals_collected": {
                "BTC": self.total_btc_collected,
                "ETH": self.total_eth_collected,
                "USDT": self.total_usdt_collected,
                "BRL": self.total_brl_collected,
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class FeeHistory(Base):
    """
    Histórico de taxas coletadas pelo sistema.
    
    Registra cada taxa coletada com detalhes da transação.
    """
    __tablename__ = "fee_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Referência da transação
    trade_id = Column(String(100), nullable=True, index=True)
    trade_type = Column(String(50), nullable=False)  # p2p, otc, instant, withdrawal
    
    # Valores
    cryptocurrency = Column(String(20), nullable=False)
    gross_amount = Column(Float, nullable=False)  # Valor bruto
    fee_percentage = Column(Float, nullable=False)  # % cobrado
    fee_amount = Column(Float, nullable=False)  # Valor da taxa
    net_amount = Column(Float, nullable=False)  # Valor líquido (gross - fee)
    
    # Partes envolvidas
    from_user_id = Column(UUID(as_uuid=True), nullable=True)
    to_user_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Status
    status = Column(String(20), default="collected", index=True)
    
    # Metadata
    notes = Column(Text, nullable=True)
    collected_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "trade_id": self.trade_id,
            "trade_type": self.trade_type,
            "cryptocurrency": self.cryptocurrency,
            "gross_amount": self.gross_amount,
            "fee_percentage": self.fee_percentage,
            "fee_amount": self.fee_amount,
            "net_amount": self.net_amount,
            "from_user_id": str(self.from_user_id) if self.from_user_id else None,
            "to_user_id": str(self.to_user_id) if self.to_user_id else None,
            "status": self.status,
            "notes": self.notes,
            "collected_at": self.collected_at.isoformat() if self.collected_at else None,
        }
