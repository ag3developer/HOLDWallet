"""
🔐 System Blockchain Wallet Model
==================================

Carteiras blockchain REAIS do sistema para receber taxas/comissões.
Usa o mesmo protocolo de segurança das carteiras dos usuários.

Suporta as mesmas 16 redes dos usuários:
- avalanche, base, bitcoin, bsc, cardano, chainlink
- dogecoin, ethereum, litecoin, multi, polkadot, polygon
- shiba, solana, tron, xrp

IMPORTANTE:
- A mnemonic está criptografada com ENCRYPTION_KEY
- As private keys são criptografadas por endereço
- Somente admins podem acessar/sacar
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.db import Base


class SystemBlockchainWallet(Base):
    """
    Carteira HD blockchain do sistema.
    
    Similar à Wallet dos usuários, mas pertence ao sistema.
    Usa BIP39/BIP44 para derivação de chaves.
    """
    __tablename__ = "system_blockchain_wallets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Identificação
    name = Column(String(100), unique=True, nullable=False)  # "main_fees", "hot_wallet", "cold_storage"
    wallet_type = Column(String(50), nullable=False, default="fees")  # fees, hot, cold
    description = Column(Text, nullable=True)
    
    # Segurança - Mnemonic criptografada (NUNCA expor!)
    encrypted_seed = Column(Text, nullable=False)  # Mnemonic criptografada
    seed_hash = Column(String(64), nullable=False)  # Hash para verificação
    
    # BIP44 derivation
    derivation_path = Column(String(100), nullable=True)  # m/44'/60'/0'
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)  # Lock para saques
    
    # Auditoria
    created_by = Column(UUID(as_uuid=True), nullable=True)  # Admin que criou
    last_accessed_by = Column(UUID(as_uuid=True), nullable=True)
    last_accessed_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    addresses = relationship("SystemBlockchainAddress", back_populates="wallet", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<SystemBlockchainWallet(id='{self.id}', name='{self.name}', type='{self.wallet_type}')>"


class SystemBlockchainAddress(Base):
    """
    Endereços blockchain do sistema.
    
    Cada endereço pertence a uma rede específica.
    Suporta todas as 16 redes dos usuários:
    - avalanche, base, bitcoin, bsc, cardano, chainlink
    - dogecoin, ethereum, litecoin, multi, polkadot, polygon
    - shiba, solana, tron, xrp
    
    Private key é criptografada.
    """
    __tablename__ = "system_blockchain_addresses"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Relacionamento com wallet
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("system_blockchain_wallets.id"), nullable=False, index=True)
    
    # Endereço blockchain
    address = Column(String(255), nullable=False, index=True)
    network = Column(String(50), nullable=False, index=True)
    # Networks: avalanche, base, bitcoin, bsc, cardano, chainlink, dogecoin, 
    #           ethereum, litecoin, multi, polkadot, polygon, shiba, solana, tron, xrp
    
    # Crypto/Token (para redes com múltiplos tokens)
    cryptocurrency = Column(String(20), nullable=True)  # BTC, ETH, USDT, LINK, SHIB, etc.
    
    # Segurança - Private key criptografada
    encrypted_private_key = Column(Text, nullable=True)
    
    # Derivation
    derivation_index = Column(Integer, nullable=True)
    derivation_path = Column(String(100), nullable=True)  # m/44'/60'/0'/0/0
    
    # Saldos (cache, atualizado periodicamente)
    cached_balance = Column(Float, default=0.0)  # Saldo nativo (ETH, MATIC, BNB, etc.)
    cached_balance_usd = Column(Float, default=0.0)  # Valor em USD
    cached_balance_updated_at = Column(DateTime, nullable=True)
    
    # Saldos de tokens ERC-20 (cache)
    cached_usdt_balance = Column(Float, default=0.0)  # USDT na rede
    cached_usdc_balance = Column(Float, default=0.0)  # USDC na rede
    cached_dai_balance = Column(Float, default=0.0)   # DAI na rede
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    address_type = Column(String(50), default="receiving")  # receiving, change
    
    # Labels para organização
    label = Column(String(100), nullable=True)  # "P2P Fees", "OTC Spread", etc.
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    wallet = relationship("SystemBlockchainWallet", back_populates="addresses")
    
    def __repr__(self):
        return f"<SystemBlockchainAddress(address='{self.address[:10]}...', network='{self.network}')>"


class SystemWalletTransaction(Base):
    """
    Histórico de transações das carteiras do sistema.
    
    Registra todas as entradas e saídas das carteiras.
    """
    __tablename__ = "system_wallet_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relacionamento
    address_id = Column(Integer, ForeignKey("system_blockchain_addresses.id"), nullable=False)
    
    # Transação
    tx_hash = Column(String(255), nullable=True, index=True)
    direction = Column(String(10), nullable=False)  # "in" or "out"
    amount = Column(Float, nullable=False)
    cryptocurrency = Column(String(20), nullable=False)
    network = Column(String(50), nullable=True)
    
    # Origem/Destino
    from_address = Column(String(255), nullable=True)
    to_address = Column(String(255), nullable=True)
    
    # Referência interna
    reference_type = Column(String(50), nullable=True)  # "p2p_fee", "otc_fee", "withdrawal"
    reference_id = Column(String(100), nullable=True)  # trade_id, etc.
    
    # Status
    status = Column(String(50), default="pending")  # pending, confirmed, failed
    confirmations = Column(Integer, default=0)
    
    # Valores em USD/BRL para auditoria
    usd_value_at_time = Column(Float, nullable=True)
    brl_value_at_time = Column(Float, nullable=True)
    
    # Notas
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    confirmed_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<SystemWalletTransaction(tx='{self.tx_hash[:10] if self.tx_hash else 'N/A'}...', amount={self.amount})>"
