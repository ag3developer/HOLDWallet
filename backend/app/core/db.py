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
        
        # Reset connection pool first to clear any aborted transactions
        engine.dispose()
        
        # Try to create all tables
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Database tables created successfully")
        except Exception as create_error:
            error_msg = str(create_error).lower()
            
            # Check if it's a transaction abort error
            if "transaction is aborted" in error_msg or "current transaction is aborted" in error_msg:
                logger.warning("⚠️  Transaction aborted, clearing connection pool and retrying...")
                # Dispose of all connections to reset state
                engine.dispose()
                
                # Wait a moment for connections to clear
                import asyncio
                await asyncio.sleep(0.5)
                
                # Try again with fresh connection
                try:
                    Base.metadata.create_all(bind=engine)
                    logger.info("✅ Database tables created successfully after reconnect")
                except Exception as retry_error:
                    logger.error(f"❌ Still failing after reconnect: {retry_error}")
                    raise retry_error
            
            # If ENUM permission issue
            elif "permission denied" in error_msg and ("enum" in error_msg.lower() or "type" in error_msg.lower()):
                logger.warning("⚠️  ENUM type creation requires higher privileges")
                logger.warning("⚠️  Note: Run on PostgreSQL: ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON TYPES TO your_user")
                raise create_error
            else:
                # Unknown error, log and fail
                logger.error(f"❌ Error creating database tables: {create_error}")
                raise create_error
                
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise e

def init_db():
    """Initialize database on startup."""
    try:
        # Test connection
        with engine.connect() as conn:
            # Reset connection state - commit any pending transaction
            conn.commit()
            logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False
