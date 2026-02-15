# Models module initialization
from .base import Base, BaseModel

# Import referral FIRST (before User) to register models for relationships
from .referral import (
    ReferralCode, Referral, ReferralEarning, ReferralConfig,
    ReferralTier, ReferralStatus
)

from .push_subscription import PushSubscription, NotificationPreference
from .user import User
from .user_profile import UserProfile, NotificationSettings as UserNotificationSettings
from .wallet import Wallet
from .address import Address
from .address_book import AddressBook, WalletType as AddressBookWalletType
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
from .security import LoginAttempt, BlockedIP, SecurityAlert, UserSession, AuditLog
from .wolkpay import (
    WolkPayInvoice, WolkPayPayer, WolkPayPayment, WolkPayApproval, 
    WolkPayTermsVersion, WolkPayPayerLimit, WolkPayAuditLog,
    InvoiceStatus, PersonType, DocumentType as WolkPayDocType, PaymentStatus, ApprovalAction
)
from .kyc import (
    KYCVerification, KYCPersonalData, KYCDocument, KYCAuditLog, KYCServiceLimit,
    KYCStatus, KYCLevel, DocumentType as KYCDocumentType, DocumentStatus,
    AuditAction as KYCAuditAction, ActorType as KYCActorType,
    UserCustomLimit, UserServiceAccess
)

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
from . import security
from . import push_subscription
from . import kyc
from . import user_profile
from . import earnpool
from . import referral

__all__ = [
    # Base
    "Base", "BaseModel",
    
    # User
    "User",
    "UserProfile",
    "UserNotificationSettings",
    
    # Wallet
    "Wallet",
    
    # Address
    "Address",
    
    # Address Book
    "AddressBook",
    "AddressBookWalletType",
    
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
    "p2p", "chat", "reputation", "system_wallet", "system_blockchain_wallet", "instant_trade", "accounting", "wolkpay",
    
    # Security & Audit
    "LoginAttempt",
    "BlockedIP",
    "SecurityAlert",
    "UserSession",
    "AuditLog",
    
    # Push Notifications
    "PushSubscription",
    "NotificationPreference",
    
    # WolkPay
    "WolkPayInvoice",
    "WolkPayPayer",
    "WolkPayPayment",
    "WolkPayApproval",
    "WolkPayTermsVersion",
    "WolkPayPayerLimit",
    "WolkPayAuditLog",
    "InvoiceStatus",
    "PersonType",
    "WolkPayDocType",
    "PaymentStatus",
    "ApprovalAction",
    
    # KYC
    "KYCVerification",
    "KYCPersonalData",
    "KYCDocument",
    "KYCAuditLog",
    "KYCServiceLimit",
    "KYCStatus",
    "KYCLevel",
    "KYCDocumentType",
    "DocumentStatus",
    "KYCAuditAction",
    "KYCActorType",
    "UserCustomLimit",
    "UserServiceAccess",
    "kyc",
    
    # User Profile
    "user_profile",
    
    # EarnPool
    "earnpool",
    
    # Referral (WOLK FRIENDS)
    "referral",
    "ReferralCode",
    "Referral",
    "ReferralEarning",
    "ReferralConfig",
    "ReferralTier",
    "ReferralStatus",
]
