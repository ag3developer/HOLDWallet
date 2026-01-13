"""
💱 Quote Cache Model
====================

Model para persistir cotações temporárias em produção.
Substitui o cache em memória que não funciona com múltiplos workers.
"""

from sqlalchemy import Column, String, DateTime, Text, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timedelta
import uuid
import json

from app.core.db import Base


class QuoteCache(Base):
    """
    Cache de cotações persistido no banco de dados.
    
    Necessário em produção porque:
    - Múltiplos workers têm memória separada
    - Workers podem reiniciar a qualquer momento
    - Quote criada em worker A precisa ser lida em worker B
    """
    __tablename__ = "quote_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quote_id = Column(String(50), unique=True, nullable=False, index=True)
    quote_data = Column(Text, nullable=False)  # JSON string
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def set_data(self, data: dict):
        """Serializa dados da quote para JSON"""
        self.quote_data = json.dumps(data, default=str)

    def get_data(self) -> dict:
        """Deserializa JSON para dict"""
        return json.loads(self.quote_data) if self.quote_data else {}

    @classmethod
    def cleanup_expired(cls, db):
        """Remove quotes expiradas"""
        db.query(cls).filter(cls.expires_at < datetime.utcnow()).delete()
        db.commit()
