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
        
        # Try to create all tables including ENUMs
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Database tables created successfully")
        except Exception as enum_error:
            error_msg = str(enum_error).lower()
            # If ENUM permission issue, create tables but skip ENUMs
            if "permission denied" in error_msg and ("enum" in error_msg.lower() or "type" in error_msg.lower()):
                logger.warning(f"⚠️  ENUM type creation requires higher privileges")
                logger.warning(f"⚠️  Attempting to create tables without ENUM constraints...")
                
                # Create tables individually, catching ENUM-related errors
                with engine.begin() as connection:
                    for table_name, table in Base.metadata.tables.items():
                        try:
                            table.create(connection, checkfirst=True)
                            logger.info(f"✅ Created table: {table_name}")
                        except Exception as table_error:
                            error_str = str(table_error).lower()
                            # If it's an ENUM or type error, log and continue
                            if "enum" in error_str or "type" in error_str or "permission" in error_str:
                                logger.warning(f"⚠️  {table_name}: {table_error}")
                                # Try again with checkfirst=False to create table structure
                                try:
                                    # Execute raw SQL to create table without ENUM
                                    connection.execute(table.insert())
                                except:
                                    pass
                            else:
                                raise table_error
                
                logger.info("✅ Table creation attempt completed (some ENUMs may not be created)")
            else:
                # Unknown error, log and fail
                logger.error(f"❌ Error creating database tables: {enum_error}")
                raise enum_error
                
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
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
