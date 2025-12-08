#!/bin/bash

# Create all necessary tables for P2P testing

sqlite3 /Users/josecarlosmartins/Documents/HOLDWallet/backend/holdwallet.db << 'EOF'

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    details TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- P2P Orders
CREATE TABLE IF NOT EXISTS p2p_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_type TEXT NOT NULL,
    cryptocurrency TEXT NOT NULL,
    fiat_currency TEXT NOT NULL,
    price REAL NOT NULL,
    total_amount REAL NOT NULL,
    available_amount REAL NOT NULL,
    min_order_limit REAL NOT NULL,
    max_order_limit REAL NOT NULL,
    payment_methods TEXT,
    time_limit INTEGER,
    terms TEXT,
    auto_reply TEXT,
    status TEXT DEFAULT 'active',
    completed_trades INTEGER DEFAULT 0,
    total_volume REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- P2P Trades
CREATE TABLE IF NOT EXISTS p2p_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    cryptocurrency TEXT NOT NULL,
    fiat_currency TEXT NOT NULL,
    amount REAL NOT NULL,
    price REAL NOT NULL,
    total_fiat REAL NOT NULL,
    payment_method_id INTEGER,
    expires_at TIMESTAMP,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet Balances
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
    UNIQUE(user_id, cryptocurrency)
);

-- Balance History
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallet_balances_user_id ON wallet_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_user_id ON balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_reference ON balance_history(reference_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_user_id ON p2p_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_p2p_trades_buyer_id ON p2p_trades(buyer_id);

EOF

echo "✅ All tables created successfully!"
