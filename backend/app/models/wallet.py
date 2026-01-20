from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum

from app.core.db import Base
from app.core.uuid_type import UUID

class Wallet(Base):
    """Wallet model for storing user wallets."""
    __tablename__ = "wallets"

    # Use UUID as primary key for consistency with other models
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    
    # Foreign keys
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Wallet information
    name = Column(String(100), nullable=False)
    network = Column(String(50), nullable=False)  # bitcoin, ethereum, polygon, bsc
    derivation_path = Column(String(100), nullable=True)
    encrypted_seed = Column(Text, nullable=True)  # Encrypted mnemonic/seed
    seed_hash = Column(String(64), nullable=True, index=True)  # Hash for verification
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # ===== BLOQUEIO GRANULAR POR TIPO DE OPERAÇÃO =====
    # Sistema de restrições que bloqueia funcionalidades específicas
    is_blocked = Column(Boolean, default=False, nullable=False, index=True)
    blocked_at = Column(DateTime, nullable=True)
    blocked_reason = Column(Text, nullable=True)
    blocked_by = Column(String(100), nullable=True)  # Admin ID que bloqueou
    
    # Restrições específicas por tipo de operação
    restrict_instant_trade = Column(Boolean, default=False, nullable=False)  # Bloqueia OTC/Trade instantâneo
    restrict_deposits = Column(Boolean, default=False, nullable=False)       # Sistema não credita depósitos
    restrict_withdrawals = Column(Boolean, default=False, nullable=False)    # Não pode sacar/enviar crypto
    restrict_p2p = Column(Boolean, default=False, nullable=False)            # Não pode usar P2P marketplace
    restrict_transfers = Column(Boolean, default=False, nullable=False)      # Não pode transferir internamente
    restrict_swap = Column(Boolean, default=False, nullable=False)           # Não pode fazer swap entre cryptos
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="wallets")
    addresses = relationship("Address", back_populates="wallet")
    
    def is_operation_allowed(self, operation_type: str) -> bool:
        """
        Verifica se uma operação específica é permitida para esta wallet.
        
        Args:
            operation_type: 'instant_trade', 'deposit', 'withdrawal', 'p2p', 'transfer', 'swap'
        
        Returns:
            True se permitido, False se bloqueado
        """
        if self.is_blocked:
            return False
        
        restriction_map = {
            'instant_trade': self.restrict_instant_trade,
            'deposit': self.restrict_deposits,
            'withdrawal': self.restrict_withdrawals,
            'p2p': self.restrict_p2p,
            'transfer': self.restrict_transfers,
            'swap': self.restrict_swap,
        }
        
        return not restriction_map.get(operation_type, False)
    
    def get_restrictions(self) -> dict:
        """Retorna todas as restrições ativas"""
        return {
            'is_blocked': self.is_blocked,
            'blocked_reason': self.blocked_reason,
            'restrictions': {
                'instant_trade': self.restrict_instant_trade,
                'deposits': self.restrict_deposits,
                'withdrawals': self.restrict_withdrawals,
                'p2p': self.restrict_p2p,
                'transfers': self.restrict_transfers,
                'swap': self.restrict_swap,
            }
        }

    def __repr__(self):
        return f"<Wallet(id='{self.id}', name='{self.name}', network='{self.network}')>"
