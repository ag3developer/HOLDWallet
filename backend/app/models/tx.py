from sqlalchemy import Column, String, DateTime, Numeric, Boolean, Text, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum
import uuid

class TransactionType(enum.Enum):
    SEND = "send"
    RECEIVE = "receive"
    SWAP = "swap"
    CONTRACT = "contract"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"

class TransactionStatus(enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REPLACED = "replaced"

class NetworkType(enum.Enum):
    BITCOIN = "bitcoin"
    ETHEREUM = "ethereum"
    POLYGON = "polygon"
    BSC = "bsc"

class Transaction(BaseModel):
    """Transaction model - records transaction metadata and status."""
    __tablename__ = "transactions"
    
    # Identification
    tx_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.user_id"), nullable=False, index=True)
    wallet_id = Column(String(36), ForeignKey("wallets.wallet_id"), nullable=False, index=True)
    
    # Transaction identifiers
    tx_hash = Column(String(66), index=True)  # Blockchain transaction hash
    internal_id = Column(String(50))  # Internal reference ID
    
    # Transaction details
    transaction_type = Column(Enum(TransactionType), nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    network = Column(Enum(NetworkType), nullable=False)
    
    # Addresses
    from_address = Column(String(100))
    to_address = Column(String(100))
    contract_address = Column(String(100))  # For token transactions
    
    # Values (stored as strings to avoid precision issues)
    amount = Column(String(50))  # Amount sent/received
    fee_amount = Column(String(50))  # Transaction fee
    gas_price = Column(String(50))  # Gas price (EVM chains)
    gas_limit = Column(String(20))  # Gas limit (EVM chains)
    gas_used = Column(String(20))  # Actual gas used (EVM chains)
    
    # Token information
    token_symbol = Column(String(10))  # BTC, ETH, USDT, etc.
    token_decimals = Column(Integer, default=18)
    token_name = Column(String(50))
    
    # Network details
    block_number = Column(String(20))  # Block number where tx was included
    block_hash = Column(String(66))
    transaction_index = Column(Integer)  # Position in block
    confirmation_count = Column(Integer, default=0)
    nonce = Column(String(20))  # Transaction nonce (EVM chains)
    
    # Timing
    broadcast_at = Column(DateTime(timezone=True))  # When tx was broadcast
    confirmed_at = Column(DateTime(timezone=True))  # When tx was confirmed
    estimated_confirmation = Column(DateTime(timezone=True))  # Estimated confirmation time
    
    # User data
    note = Column(Text)  # User note/memo
    category = Column(String(50))  # User-defined category
    tags = Column(Text)  # Comma-separated tags
    
    # Price data at time of transaction (for historical value tracking)
    price_usd = Column(String(20))  # Token price in USD at tx time
    price_brl = Column(String(20))  # Token price in BRL at tx time
    value_usd = Column(String(20))  # Transaction value in USD
    value_brl = Column(String(20))  # Transaction value in BRL
    
    # Metadata
    raw_data = Column(Text)  # Raw transaction data (JSON)
    error_message = Column(Text)  # Error message if failed
    replacement_tx = Column(String(66))  # Hash of replacement transaction
    
    # Relationships
    user = relationship("User")
    wallet = relationship("Wallet")
    
    def __repr__(self):
        return f"<Transaction(hash={self.tx_hash}, type={self.transaction_type.value}, status={self.status.value})>"

class TransactionLog(BaseModel):
    """Transaction log model - tracks changes to transaction status."""
    __tablename__ = "transaction_logs"
    
    # Identification
    log_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    tx_id = Column(String(36), ForeignKey("transactions.tx_id"), nullable=False, index=True)
    
    # Log details
    old_status = Column(Enum(TransactionStatus))
    new_status = Column(Enum(TransactionStatus))
    old_confirmation_count = Column(Integer, default=0)
    new_confirmation_count = Column(Integer, default=0)
    
    # Change details
    change_reason = Column(String(100))  # broadcast, confirmed, failed, etc.
    block_number = Column(String(20))
    
    # Metadata
    raw_data = Column(Text)  # Raw blockchain data at time of change
    notes = Column(Text)
    
    # Relationships
    transaction = relationship("Transaction")
    
    def __repr__(self):
        return f"<TransactionLog(tx_id={self.tx_id}, {self.old_status} -> {self.new_status})>"
