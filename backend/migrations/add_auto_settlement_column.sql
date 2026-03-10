-- Migration: Add auto_settlement column to gateway_merchants
-- Date: 2026-03-10
-- Description: Adds auto_settlement boolean column for automatic settlement configuration

-- Add the column with default value
ALTER TABLE gateway_merchants 
ADD COLUMN IF NOT EXISTS auto_settlement BOOLEAN DEFAULT TRUE NOT NULL;

-- Add comment
COMMENT ON COLUMN gateway_merchants.auto_settlement IS 'Whether automatic settlement is enabled for this merchant';
