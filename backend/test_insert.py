#!/usr/bin/env python3

import sqlite3
import uuid
import os
from datetime import datetime

def test_insert():
    print("=== Test Direct SQLite Insert ===")
    
    # Get absolute database path
    db_path = os.path.abspath('holdwallet.db')
    print(f"Database path: {db_path}")
    print(f"Database exists: {os.path.exists(db_path)}")
    print(f"Current working directory: {os.getcwd()}")
    
    # Connect to database
    conn = sqlite3.connect(db_path, timeout=30.0)
    cursor = conn.cursor()
    
    try:
        # Check table structure
        cursor.execute('PRAGMA table_info(wallets)')
        columns = cursor.fetchall()
        print(f"Table columns: {columns}")
        
        # Check if sqlite_sequence exists and has wallets
        cursor.execute("SELECT * FROM sqlite_sequence WHERE name='wallets'")
        seq_info = cursor.fetchall()
        print(f"Sequence info: {seq_info}")
        
        # Test user ID
        user_id = "1d285076-7b2b-4f97-b7b1-db19854b849e"
        name = "Test Wallet API"
        network = "multi"
        now = datetime.now()
        
        print(f"Inserting: user_id={user_id}, name={name}, network={network}")
        
        # Try the exact same insert as in the service
        cursor.execute("""
            INSERT INTO wallets (user_id, name, network, is_active, created_at) 
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, name, network, 1, now.isoformat()))
        
        wallet_id = cursor.lastrowid
        conn.commit()
        
        print(f"✅ SUCCESS: Wallet inserted with ID: {wallet_id}")
        
        # Verify the insert
        cursor.execute("SELECT * FROM wallets WHERE id = ?", (wallet_id,))
        wallet = cursor.fetchone()
        print(f"Verified wallet: {wallet}")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        conn.rollback()
        
    finally:
        conn.close()

if __name__ == "__main__":
    test_insert()
