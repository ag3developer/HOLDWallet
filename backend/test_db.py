#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.db import engine, get_db
from app.models.wallet import Wallet
from sqlalchemy import text

def test_database():
    """Test database connection and wallet table structure."""
    
    print("Testing database connection...")
    
    # Test raw SQL
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(wallets)"))
        columns = result.fetchall()
        print("\nTable structure from raw SQL:")
        for col in columns:
            print(f"  {col[1]}: {col[2]} (nullable: {col[3] == 0})")
    
    # Test SQLAlchemy ORM
    print("\nTesting SQLAlchemy ORM...")
    try:
        # Try to get a session
        db = next(get_db())
        
        # Check if we can query wallets
        wallet_count = db.query(Wallet).count()
        print(f"Current wallet count: {wallet_count}")
        
        # Try to create a test wallet (without committing)
        test_wallet = Wallet(
            user_id="test-user-id",
            name="Test Wallet", 
            network="bitcoin",
            derivation_path="m/44'/0'/0'",
            encrypted_seed="test-encrypted-seed",
            seed_hash="test-hash"
        )
        
        print("\nTest wallet object created successfully")
        print(f"Encrypted seed: {test_wallet.encrypted_seed}")
        print(f"Seed hash: {test_wallet.seed_hash}")
        
        db.close()
        print("✅ Database test completed successfully")
        
    except Exception as e:
        print(f"❌ Error testing SQLAlchemy: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_database()
