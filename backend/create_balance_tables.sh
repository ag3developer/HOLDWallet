#!/bin/bash

# Create wallet balance tables

sqlite3 /Users/josecarlosmartins/Documents/HOLDWallet/backend/holdwallet.db << 'EOF'

-- Wallet Balances table
CREATE TABLE IF NOT EXISTS wallet_balances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cryptocurrency TEXT NOT NULL,
    available_balance REAL DEFAULT 0.0,
    locked_balance REAL DEFAULT 0.0,
    total_balance REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_reason TEXT,
    UNIQUE(user_id, cryptocurrency),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Balance History table for audit
CREATE TABLE IF NOT EXISTS balance_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    cryptocurrency TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_before REAL NOT NULL,
    balance_after REAL NOT NULL,
    locked_before REAL NOT NULL,
    locked_after REAL NOT NULL,
    reference_id TEXT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallet_balances_user_id ON wallet_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_user_id ON balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_reference ON balance_history(reference_id);

EOF

echo "✅ Wallet balance tables created successfully!"
