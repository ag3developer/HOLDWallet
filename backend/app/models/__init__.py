# Models module initialization
from .base import Base, BaseModel
from .user import User
from .wallet import Wallet
from .address import Address
from .transaction import Transaction
from .two_factor import TwoFactorAuth
from .webauthn import WebAuthnCredential
from .system_wallet import SystemWallet, FeeHistory, FeeType, FeeStatus
from .system_blockchain_wallet import (
    SystemBlockchainWallet, 
    SystemBlockchainAddress, 
    SystemWalletTransaction
)
from .instant_trade import InstantTrade, InstantTradeHistory, TradeStatus, TradeOperationType
from .accounting import AccountingEntry, AccountingReport, AccountingEntryType, AccountingEntryStatus
from .platform_settings import PlatformSettings

# Import P2P models to ensure tables are created
from . import p2p
from . import chat
from . import reputation
from . import system_wallet
from . import system_blockchain_wallet
from . import instant_trade
from . import accounting
from . import platform_settings
from . import webauthn

__all__ = [
    # Base
    "Base", "BaseModel",
    
    # User
    "User",
    
    # Wallet
    "Wallet",
    
    # Address
    "Address",
    
    # Transaction
    "Transaction",
    
    # Two Factor Auth
    "TwoFactorAuth",
    
    # WebAuthn
    "WebAuthnCredential",
    
    # System Wallet & Fees (Contábil)
    "SystemWallet",
    "FeeHistory",
    "FeeType",
    "FeeStatus",
    
    # System Blockchain Wallet (Real)
    "SystemBlockchainWallet",
    "SystemBlockchainAddress",
    "SystemWalletTransaction",
    
    # Instant Trade OTC
    "InstantTrade",
    "InstantTradeHistory",
    "TradeStatus",
    "TradeOperationType",
    
    # Accounting
    "AccountingEntry",
    "AccountingReport",
    "AccountingEntryType",
    "AccountingEntryStatus",
    
    # Modules for table creation
    "p2p", "chat", "reputation", "system_wallet", "system_blockchain_wallet", "instant_trade", "accounting"
]
