# Models module initialization
from .base import Base, BaseModel
from .user import User
from .wallet import Wallet
from .address import Address
from .transaction import Transaction
from .two_factor import TwoFactorAuth
from .balance import WalletBalance

# Import P2P models to ensure tables are created
from . import p2p
from . import chat
from . import reputation

__all__ = [
    # Base
    "Base", "BaseModel",
    
    # User
    "User",
    
    # Wallet
    "Wallet",
    "WalletBalance",
    
    # Address
    "Address",
    
    # Transaction
    "Transaction",
    
    # Two Factor Auth
    "TwoFactorAuth",
    
    # Modules for table creation
    "p2p", "chat", "reputation"
]
