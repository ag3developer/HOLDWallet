from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create SQLAlchemy engine
# Digital Ocean managed databases have limited connections (usually 22-25)
# We need to keep pool small to avoid exhausting connections
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
        pool_pre_ping=True,      # Verify connection is alive before using
        pool_recycle=300,        # Recycle connections after 5 minutes
        pool_timeout=30,         # Wait max 30 seconds for connection
        pool_size=3,             # Keep only 3 connections in pool
        max_overflow=5,          # Allow up to 5 extra connections when busy
        connect_args={
            "connect_timeout": 10,
            "options": "-c statement_timeout=30000"
        }
    )

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def create_tables():
    """Create all database tables."""
    try:
        # Import models to ensure they are registered with Base
        from app.models.wallet import Wallet
        from app.models.transaction import Transaction 
        from app.models.price_cache import PriceCache
        from app.models.user_settings import UserSettings
        
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise e
