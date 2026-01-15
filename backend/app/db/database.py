"""
Database configuration - redirects to app.core.db to avoid duplicate connection pools.

⚠️ IMPORTANT: All database connections must use the same pool!
This file exists for backward compatibility - new code should import from app.core.db
"""
from app.core.db import (
    engine,
    SessionLocal,
    Base,
    get_db,
    create_tables
)

# Re-export everything for backward compatibility
__all__ = ['engine', 'SessionLocal', 'Base', 'get_db', 'create_tables']
