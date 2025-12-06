"""
UUID Type for SQLite Compatibility
==================================

Custom UUID type that works with SQLite by storing as string
while maintaining UUID functionality.
"""

from sqlalchemy import TypeDecorator, String
from sqlalchemy.dialects import postgresql
import uuid


class UUID(TypeDecorator):
    """Platform-independent UUID type.
    
    Uses PostgreSQL's UUID type when available,
    otherwise uses String(36) for SQLite.
    """
    impl = String
    cache_ok = True

    def __init__(self, as_uuid=True):
        """Initialize UUID type.
        
        Args:
            as_uuid: Compatibility parameter (ignored for SQLite)
        """
        self.as_uuid = as_uuid
        super().__init__()

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(postgresql.UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return str(value)
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            return value
