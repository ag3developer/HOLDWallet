-- Migration: Add missing columns to user_settings table
-- Date: 2026-01-12
-- Description: Adds columns that exist in the model but not in the database

-- Add require_pin_for_transactions if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'require_pin_for_transactions') THEN
        ALTER TABLE user_settings ADD COLUMN require_pin_for_transactions BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Add biometric_enabled if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'biometric_enabled') THEN
        ALTER TABLE user_settings ADD COLUMN biometric_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add auto_lock_timeout if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'auto_lock_timeout') THEN
        ALTER TABLE user_settings ADD COLUMN auto_lock_timeout INTEGER DEFAULT 300;
    END IF;
END $$;

-- Add preferred_networks if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'preferred_networks') THEN
        ALTER TABLE user_settings ADD COLUMN preferred_networks JSONB;
    END IF;
END $$;

-- Add gas_preference if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'gas_preference') THEN
        ALTER TABLE user_settings ADD COLUMN gas_preference VARCHAR(10) DEFAULT 'standard';
    END IF;
END $$;

-- Add transaction_notifications if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'transaction_notifications') THEN
        ALTER TABLE user_settings ADD COLUMN transaction_notifications BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Add price_alerts if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'price_alerts') THEN
        ALTER TABLE user_settings ADD COLUMN price_alerts BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add security_notifications if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'security_notifications') THEN
        ALTER TABLE user_settings ADD COLUMN security_notifications BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Add developer_mode if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'developer_mode') THEN
        ALTER TABLE user_settings ADD COLUMN developer_mode BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add custom_rpc_urls if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'custom_rpc_urls') THEN
        ALTER TABLE user_settings ADD COLUMN custom_rpc_urls JSONB;
    END IF;
END $$;

-- Add address_book if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'address_book') THEN
        ALTER TABLE user_settings ADD COLUMN address_book JSONB;
    END IF;
END $$;

-- Add backup_reminder_enabled if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'backup_reminder_enabled') THEN
        ALTER TABLE user_settings ADD COLUMN backup_reminder_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Add last_backup_reminder if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'last_backup_reminder') THEN
        ALTER TABLE user_settings ADD COLUMN last_backup_reminder TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add backup_frequency_days if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'backup_frequency_days') THEN
        ALTER TABLE user_settings ADD COLUMN backup_frequency_days INTEGER DEFAULT 30;
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_settings'
ORDER BY ordinal_position;
