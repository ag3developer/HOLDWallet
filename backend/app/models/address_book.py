"""
Address Book Model - Agenda de endereços salvos pelo usuário
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.core.db import Base
from app.core.uuid_type import UUID


class WalletType(str, enum.Enum):
    """Tipo de carteira/destino"""
    # Exchanges
    BINANCE = "binance"
    BITGET = "bitget"
    BYBIT = "bybit"
    COINBASE = "coinbase"
    KRAKEN = "kraken"
    KUCOIN = "kucoin"
    OKX = "okx"
    GATEIO = "gate.io"
    HUOBI = "huobi"
    MEXC = "mexc"
    BITFINEX = "bitfinex"
    GEMINI = "gemini"
    CRYPTOCOM = "crypto.com"
    
    # Wallets
    METAMASK = "metamask"
    TRUST_WALLET = "trust_wallet"
    BITGET_WALLET = "bitget_wallet"
    PHANTOM = "phantom"
    EXODUS = "exodus"
    LEDGER = "ledger"
    TREZOR = "trezor"
    COINBASE_WALLET = "coinbase_wallet"
    RAINBOW = "rainbow"
    ZERION = "zerion"
    RABBY = "rabby"
    ARGENT = "argent"
    SAFE = "safe"  # Gnosis Safe
    
    # Outros
    PERSONAL = "personal"  # Carteira pessoal (outra)
    FRIEND = "friend"      # Endereço de amigo/conhecido
    BUSINESS = "business"  # Endereço comercial
    OTHER = "other"        # Outro


class WalletCategory(str, enum.Enum):
    """Categoria do tipo de carteira"""
    EXCHANGE = "exchange"
    WALLET = "wallet"
    PERSONAL = "personal"
    OTHER = "other"


class AddressBook(Base):
    """Modelo de endereço salvo na agenda"""
    __tablename__ = "address_book"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Informações do contato
    name = Column(String(100), nullable=False)  # Nome/apelido do endereço
    address = Column(String(255), nullable=False, index=True)  # Endereço blockchain
    
    # Rede blockchain
    network = Column(String(50), nullable=False, index=True)  # ethereum, polygon, bitcoin, etc.
    
    # Tipo de carteira/destino
    # Usa values_callable para garantir que os valores do enum (minúsculos) sejam usados nas queries
    wallet_type = Column(
        SQLEnum(WalletType, values_callable=lambda x: [e.value for e in x]),
        default=WalletType.OTHER,
        nullable=False
    )
    wallet_category = Column(
        SQLEnum(WalletCategory, values_callable=lambda x: [e.value for e in x]),
        default=WalletCategory.OTHER,
        nullable=False
    )
    
    # Informações adicionais
    memo = Column(String(255), nullable=True)  # Memo/Tag (para XRP, BNB, etc)
    notes = Column(Text, nullable=True)  # Notas/observações do usuário
    
    # Controle
    is_favorite = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)  # Se o usuário verificou o endereço
    use_count = Column(Integer, default=0, nullable=False)  # Quantas vezes foi usado
    last_used_at = Column(DateTime, nullable=True)  # Última vez que foi usado
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relacionamentos
    user = relationship("User", back_populates="address_book_entries")

    def __repr__(self):
        return f"<AddressBook(id={self.id}, name='{self.name}', network='{self.network}')>"
    
    def to_dict(self):
        """Converte para dicionário"""
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "network": self.network,
            "wallet_type": self.wallet_type.value if self.wallet_type else None,
            "wallet_category": self.wallet_category.value if self.wallet_category else None,
            "memo": self.memo,
            "notes": self.notes,
            "is_favorite": self.is_favorite,
            "is_verified": self.is_verified,
            "use_count": self.use_count,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# Mapeamento de tipos para categorias
WALLET_TYPE_TO_CATEGORY = {
    # Exchanges
    WalletType.BINANCE: WalletCategory.EXCHANGE,
    WalletType.BITGET: WalletCategory.EXCHANGE,
    WalletType.BYBIT: WalletCategory.EXCHANGE,
    WalletType.COINBASE: WalletCategory.EXCHANGE,
    WalletType.KRAKEN: WalletCategory.EXCHANGE,
    WalletType.KUCOIN: WalletCategory.EXCHANGE,
    WalletType.OKX: WalletCategory.EXCHANGE,
    WalletType.GATEIO: WalletCategory.EXCHANGE,
    WalletType.HUOBI: WalletCategory.EXCHANGE,
    WalletType.MEXC: WalletCategory.EXCHANGE,
    WalletType.BITFINEX: WalletCategory.EXCHANGE,
    WalletType.GEMINI: WalletCategory.EXCHANGE,
    WalletType.CRYPTOCOM: WalletCategory.EXCHANGE,
    
    # Wallets
    WalletType.METAMASK: WalletCategory.WALLET,
    WalletType.TRUST_WALLET: WalletCategory.WALLET,
    WalletType.BITGET_WALLET: WalletCategory.WALLET,
    WalletType.PHANTOM: WalletCategory.WALLET,
    WalletType.EXODUS: WalletCategory.WALLET,
    WalletType.LEDGER: WalletCategory.WALLET,
    WalletType.TREZOR: WalletCategory.WALLET,
    WalletType.COINBASE_WALLET: WalletCategory.WALLET,
    WalletType.RAINBOW: WalletCategory.WALLET,
    WalletType.ZERION: WalletCategory.WALLET,
    WalletType.RABBY: WalletCategory.WALLET,
    WalletType.ARGENT: WalletCategory.WALLET,
    WalletType.SAFE: WalletCategory.WALLET,
    
    # Pessoal
    WalletType.PERSONAL: WalletCategory.PERSONAL,
    WalletType.FRIEND: WalletCategory.PERSONAL,
    WalletType.BUSINESS: WalletCategory.PERSONAL,
    
    # Outros
    WalletType.OTHER: WalletCategory.OTHER,
}


# Lista de exchanges com informações
EXCHANGES_INFO = {
    "binance": {"name": "Binance", "icon": "binance", "color": "#F0B90B"},
    "bitget": {"name": "Bitget", "icon": "bitget", "color": "#00F0FF"},
    "bybit": {"name": "Bybit", "icon": "bybit", "color": "#F7A600"},
    "coinbase": {"name": "Coinbase", "icon": "coinbase", "color": "#0052FF"},
    "kraken": {"name": "Kraken", "icon": "kraken", "color": "#5741D9"},
    "kucoin": {"name": "KuCoin", "icon": "kucoin", "color": "#23AF91"},
    "okx": {"name": "OKX", "icon": "okx", "color": "#000000"},
    "gate.io": {"name": "Gate.io", "icon": "gateio", "color": "#17E6A1"},
    "huobi": {"name": "Huobi", "icon": "huobi", "color": "#1C6CFD"},
    "mexc": {"name": "MEXC", "icon": "mexc", "color": "#00B897"},
    "bitfinex": {"name": "Bitfinex", "icon": "bitfinex", "color": "#16B157"},
    "gemini": {"name": "Gemini", "icon": "gemini", "color": "#00DCFA"},
    "crypto.com": {"name": "Crypto.com", "icon": "cryptocom", "color": "#002D74"},
}


# Lista de wallets com informações
WALLETS_INFO = {
    "metamask": {"name": "MetaMask", "icon": "metamask", "color": "#F6851B"},
    "trust_wallet": {"name": "Trust Wallet", "icon": "trust", "color": "#3375BB"},
    "bitget_wallet": {"name": "Bitget Wallet", "icon": "bitget", "color": "#00F0FF"},
    "phantom": {"name": "Phantom", "icon": "phantom", "color": "#AB9FF2"},
    "exodus": {"name": "Exodus", "icon": "exodus", "color": "#1F2138"},
    "ledger": {"name": "Ledger", "icon": "ledger", "color": "#000000"},
    "trezor": {"name": "Trezor", "icon": "trezor", "color": "#00854D"},
    "coinbase_wallet": {"name": "Coinbase Wallet", "icon": "coinbase", "color": "#0052FF"},
    "rainbow": {"name": "Rainbow", "icon": "rainbow", "color": "#001E59"},
    "zerion": {"name": "Zerion", "icon": "zerion", "color": "#2962EF"},
    "rabby": {"name": "Rabby", "icon": "rabby", "color": "#8697FF"},
    "argent": {"name": "Argent", "icon": "argent", "color": "#FF875B"},
    "safe": {"name": "Safe (Gnosis)", "icon": "safe", "color": "#12FF80"},
}
