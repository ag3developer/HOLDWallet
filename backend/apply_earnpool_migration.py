"""
EarnPool Database Migration
===========================

Script para criar as tabelas do EarnPool no banco de dados.

Uso:
    python apply_earnpool_migration.py
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.core.db import Base

# Import models to register them
from app.models.earnpool import (
    EarnPoolConfig,
    EarnPoolDeposit,
    EarnPoolWithdrawal,
    EarnPoolYield,
    EarnPoolYieldDistribution
)


def create_earnpool_tables():
    """Create EarnPool tables"""
    print("🚀 Creating EarnPool tables...")
    print(f"📍 Database: {settings.DATABASE_URL[:50]}...")
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    # Get table names to create
    tables_to_create = [
        EarnPoolConfig.__table__,
        EarnPoolDeposit.__table__,
        EarnPoolWithdrawal.__table__,
        EarnPoolYield.__table__,
        EarnPoolYieldDistribution.__table__,
    ]
    
    # Create tables
    for table in tables_to_create:
        try:
            table.create(engine, checkfirst=True)
            print(f"✅ Table {table.name} created/verified")
        except Exception as e:
            print(f"❌ Error creating table {table.name}: {e}")
    
    # Verify tables exist
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE 'earnpool%'
        """))
        tables = [row[0] for row in result]
        
        print(f"\n📋 EarnPool tables in database:")
        for table in tables:
            print(f"   - {table}")
    
    print("\n✅ EarnPool migration complete!")


def create_default_config():
    """Create default EarnPool configuration"""
    from app.core.db import SessionLocal
    from app.services.earnpool_service import EarnPoolService
    
    print("\n📝 Creating default EarnPool config...")
    
    db = SessionLocal()
    try:
        service = EarnPoolService(db)
        config = service.get_or_create_config()
        
        print(f"✅ Config created:")
        print(f"   - ID: {config.id}")
        print(f"   - Min deposit: ${config.min_deposit_usdt}")
        print(f"   - Lock period: {config.lock_period_days} days")
        print(f"   - Withdrawal delay: {config.withdrawal_delay_days} days")
        print(f"   - Early withdrawal admin fee: {config.early_withdrawal_admin_fee}%")
        print(f"   - Early withdrawal op fee: {config.early_withdrawal_op_fee}%")
        print(f"   - Target weekly yield: {config.target_weekly_yield_percentage}%")
        print(f"   - Accepting deposits: {config.is_accepting_deposits}")
        
    except Exception as e:
        print(f"❌ Error creating config: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_earnpool_tables()
    create_default_config()
