"""
Migration: Add yield_period_type column to earnpool_config table

This migration adds the yield_period_type column to allow admins to configure
whether the yield percentage is displayed as weekly, monthly, or yearly.
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / '.env')

import psycopg2
from psycopg2 import sql

def get_connection():
    """Get database connection from DATABASE_URL"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL not found in environment")
    
    # Parse the URL
    if database_url.startswith('postgresql://'):
        return psycopg2.connect(database_url)
    else:
        raise ValueError(f"Unsupported database URL format: {database_url[:20]}...")

def run_migration():
    """Add yield_period_type column to earnpool_config"""
    print("🚀 Starting migration: Add yield_period_type to earnpool_config...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'earnpool_config' 
            AND column_name = 'yield_period_type'
        """)
        
        if cursor.fetchone():
            print("✅ Column yield_period_type already exists. Skipping.")
            return
        
        # Add the column
        print("📦 Adding yield_period_type column...")
        cursor.execute("""
            ALTER TABLE earnpool_config 
            ADD COLUMN yield_period_type VARCHAR(20) NOT NULL DEFAULT 'WEEKLY'
        """)
        
        conn.commit()
        print("✅ Migration completed successfully!")
        
        # Verify
        cursor.execute("""
            SELECT id, yield_period_type, target_weekly_yield_percentage 
            FROM earnpool_config 
            WHERE is_active = true
        """)
        row = cursor.fetchone()
        if row:
            print(f"📊 Current config: period={row[1]}, yield={row[2]}%")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
