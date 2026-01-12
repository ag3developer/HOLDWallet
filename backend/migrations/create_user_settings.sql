-- Create user_settings table
-- Run this SQL in your PostgreSQL database

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

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON TABLE user_settings TO your_app_user;
