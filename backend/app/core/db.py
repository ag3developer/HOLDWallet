from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
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
        pool_recycle=300,        # Recycle connections after 5 minutes (avoid stale)
        pool_timeout=30,         # Wait max 30 seconds for connection from pool
        pool_size=3,             # Keep only 3 connections in pool (DO has ~22 max)
        max_overflow=5,          # Allow up to 5 extra connections when busy
        connect_args={
            "connect_timeout": 10,  # Connection timeout in seconds
            "options": "-c statement_timeout=30000"  # 30 second query timeout
        }
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
    """Create all database tables using Alembic migrations if possible, fallback to SQLAlchemy."""
    try:
        from sqlalchemy import inspect, text
        import subprocess
        import os
        
        # Import all models first to register them
        logger.info("📦 Importing all models...")
        try:
            from app.models.user import User
            from app.models.wallet import Wallet
            from app.models.address import Address
            from app.models.transaction import Transaction
            from app.models.two_factor import TwoFactorAuth
            
            # Import optional models
            try:
                from app.models import p2p, reputation, trader_profile, instant_trade, chat
                from app.models.platform_settings import PlatformSettings  # Settings model
                logger.info("   ✅ All models imported successfully")
            except ImportError as e:
                logger.warning(f"   ⚠️  Some optional models not available: {e}")
        except ImportError as e:
            logger.error(f"   ❌ Failed to import core models: {e}")
            raise
        
        # Check if tables already exist
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if existing_tables:
            logger.info(f"✅ Database already has {len(existing_tables)} tables")
            return
        
        logger.info("🔍 No tables found. Attempting to create them...")
        
        # Method 1: Try Alembic migrations (best for production)
        try:
            logger.info("📝 Attempting to run Alembic migrations...")
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            
            result = subprocess.run(
                ["python", "-m", "alembic", "upgrade", "head"],
                cwd=backend_dir,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                logger.info("✅ Alembic migrations executed successfully!")
                
                # Verify tables were created
                inspector = inspect(engine)
                tables = inspector.get_table_names()
                if tables:
                    logger.info(f"✅ {len(tables)} tables created via Alembic")
                    return
            else:
                logger.warning(f"⚠️  Alembic failed: {result.stderr}")
                logger.info("   Falling back to SQLAlchemy...")
        except Exception as alembic_error:
            logger.warning(f"⚠️  Alembic not available: {alembic_error}")
            logger.info("   Falling back to SQLAlchemy...")
        
        # Method 2: SQLAlchemy create_all (fallback)
        try:
            logger.info("🔨 Creating tables with SQLAlchemy...")
            engine.dispose()  # Clear connection pool
            
            Base.metadata.create_all(bind=engine)
            
            # Verify tables were created
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            
            if tables:
                logger.info(f"✅ {len(tables)} tables created successfully!")
                for table in sorted(tables)[:10]:  # Show first 10
                    logger.info(f"   - {table}")
                if len(tables) > 10:
                    logger.info(f"   ... and {len(tables) - 10} more")
            else:
                logger.warning("⚠️  No tables were created!")
                
        except Exception as sqlalchemy_error:
            error_msg = str(sqlalchemy_error).lower()
            
            if "permission denied" in error_msg:
                logger.error("❌ PERMISSION DENIED - Database user cannot create tables!")
                logger.error("   Solution: Execute migrations from Digital Ocean Console:")
                logger.error("   cd /workspace/backend && python -m alembic upgrade head")
                # Don't fail startup - let app try to work with existing tables
                logger.warning("⚠️  Continuing startup anyway...")
            else:
                logger.error(f"❌ Failed to create tables: {sqlalchemy_error}")
                raise
                
    except Exception as e:
        logger.error(f"❌ Table creation failed: {e}")
        # Don't fail the entire application startup
        logger.warning("⚠️  Application will continue but may not work without tables!")
        logger.warning("   Please create tables manually or via Alembic migrations")

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
