#!/usr/bin/env python3
"""
Script to create missing tables in the database.
Run this to fix: relation "user_settings" does not exist
"""

from sqlalchemy import text, inspect
from app.core.db import engine

def create_user_settings_table():
    """Create user_settings table if it doesn't exist."""
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    if 'user_settings' in tables:
        print("✅ user_settings table already exists")
        return
    
    print("Creating user_settings table...")
    
    sql = """
    CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE,
        
        -- Display preferences
        default_currency VARCHAR(5) DEFAULT 'USD',
        theme VARCHAR(10) DEFAULT 'light',
        language VARCHAR(5) DEFAULT 'en',
        
        -- Security preferences
        auto_lock_timeout INTEGER DEFAULT 300,
        require_pin_for_transactions BOOLEAN DEFAULT TRUE,
        biometric_enabled BOOLEAN DEFAULT FALSE,
        
        -- Network preferences
        preferred_networks JSONB,
        gas_preference VARCHAR(10) DEFAULT 'standard',
        
        -- Notification preferences
        transaction_notifications BOOLEAN DEFAULT TRUE,
        price_alerts BOOLEAN DEFAULT FALSE,
        security_notifications BOOLEAN DEFAULT TRUE,
        
        -- Advanced settings
        developer_mode BOOLEAN DEFAULT FALSE,
        custom_rpc_urls JSONB,
        address_book JSONB,
        
        -- Metadata
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE,
        last_login TIMESTAMP WITH TIME ZONE,
        
        -- Backup settings
        backup_reminder_enabled BOOLEAN DEFAULT TRUE,
        last_backup_reminder TIMESTAMP WITH TIME ZONE,
        backup_frequency_days INTEGER DEFAULT 30,
        
        -- Foreign key
        CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
    """
    
    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()
    
    print("✅ user_settings table created successfully!")

if __name__ == "__main__":
    create_user_settings_table()
