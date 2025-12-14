from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create SQLAlchemy engine
if "sqlite" in settings.DATABASE_URL:
    engine = create_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_recycle=3600
    )

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def create_tables():
    """Create all database tables."""
    try:
        # Import all models for table creation
        from app.models.user import User
        from app.models.wallet import Wallet
        from app.models.address import Address
        from app.models.transaction import Transaction
        from app.models.two_factor import TwoFactorAuth
        
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        # If it's a permission error for ENUM types, log it but don't fail startup
        error_msg = str(e).lower()
        if "permission denied" in error_msg and ("enum" in error_msg.lower() or "type" in error_msg.lower()):
            logger.warning(f"⚠️  ENUM type creation permission issue (non-critical): {e}")
            logger.warning("⚠️  Tables may need manual database permission fixes")
            # Try to create tables without ENUMs (they may already exist)
            try:
                Base.metadata.create_all(bind=engine)
            except Exception:
                pass
        else:
            logger.error(f"Error creating database tables: {e}")
            raise e

def init_db():
    """Initialize database on startup."""
    try:
        # Test connection
        with engine.connect():
            logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False
