"""
🚫 Blacklist Model
==================

Modelo para armazenar endereços bloqueados.

Author: HOLD Wallet Team
"""

from sqlalchemy import Column, String, DateTime, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone

from app.core.db import Base


class AddressBlacklist(Base):
    """
    Tabela de endereços na lista negra.
    
    Endereços nesta lista são bloqueados de:
    - Receber depósitos
    - Fazer saques
    - Participar de transações
    """
    __tablename__ = "address_blacklist"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    address = Column(String(255), nullable=False, index=True)
    network = Column(String(50), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=True)  # Dono do endereço, se conhecido
    added_by = Column(String(255), nullable=False)  # Admin que adicionou
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<AddressBlacklist {self.address} ({self.network})>"
