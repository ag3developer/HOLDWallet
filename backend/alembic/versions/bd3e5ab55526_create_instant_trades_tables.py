"""create_instant_trades_tables

Revision ID: bd3e5ab55526
Revises: p2p_complete_001
Create Date: 2025-11-25 22:25:50.131958

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bd3e5ab55526'
down_revision = 'p2p_complete_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Criar tabela instant_trades (adaptada para SQLite)
    op.execute("""
        CREATE TABLE IF NOT EXISTS instant_trades (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            user_id INTEGER NOT NULL,
            
            operation_type TEXT NOT NULL CHECK (operation_type IN ('buy', 'sell')),
            
            cryptocurrency_id INTEGER,
            symbol TEXT NOT NULL,
            
            fiat_currency TEXT NOT NULL DEFAULT 'BRL',
            fiat_amount REAL NOT NULL,
            crypto_amount REAL NOT NULL,
            
            crypto_price REAL NOT NULL,
            spread_percentage REAL NOT NULL DEFAULT 3.00,
            spread_amount REAL NOT NULL,
            network_fee_percentage REAL NOT NULL DEFAULT 0.25,
            network_fee_amount REAL NOT NULL,
            total_amount REAL NOT NULL,
            
            payment_method TEXT NOT NULL,
            payment_id TEXT,
            payment_proof_url TEXT,
            pix_qr_code TEXT,
            pix_copy_paste TEXT,
            
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                'pending', 'payment_processing', 'payment_confirmed', 
                'completed', 'expired', 'cancelled', 'failed'
            )),
            
            expires_at TEXT NOT NULL,
            payment_confirmed_at TEXT,
            completed_at TEXT,
            
            wallet_id INTEGER,
            address_id INTEGER,
            transaction_hash TEXT,
            
            ip_address TEXT,
            user_agent TEXT,
            notes TEXT,
            reference_code TEXT UNIQUE,
            
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (cryptocurrency_id) REFERENCES cryptocurrencies(id),
            FOREIGN KEY (wallet_id) REFERENCES wallets(id),
            FOREIGN KEY (address_id) REFERENCES addresses(id)
        );
    """)
    
    # Criar índices
    op.execute("CREATE INDEX IF NOT EXISTS idx_instant_trades_user_id ON instant_trades(user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_instant_trades_status ON instant_trades(status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_instant_trades_created_at ON instant_trades(created_at DESC);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_instant_trades_expires_at ON instant_trades(expires_at);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_instant_trades_reference_code ON instant_trades(reference_code);")
    
    # Criar tabela instant_trade_history
    op.execute("""
        CREATE TABLE IF NOT EXISTS instant_trade_history (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            trade_id TEXT NOT NULL,
            
            previous_status TEXT,
            new_status TEXT NOT NULL,
            
            changed_by_user_id INTEGER,
            reason TEXT,
            metadata TEXT,
            
            created_at TEXT DEFAULT (datetime('now')),
            
            FOREIGN KEY (trade_id) REFERENCES instant_trades(id) ON DELETE CASCADE,
            FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
        );
    """)
    
    # Índice para histórico
    op.execute("CREATE INDEX IF NOT EXISTS idx_instant_trade_history_trade_id ON instant_trade_history(trade_id);")
    
    # Trigger para atualizar updated_at
    op.execute("""
        CREATE TRIGGER IF NOT EXISTS trigger_update_instant_trades_updated_at
        AFTER UPDATE ON instant_trades
        FOR EACH ROW
        BEGIN
            UPDATE instant_trades SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trigger_update_instant_trades_updated_at;")
    op.execute("DROP TABLE IF EXISTS instant_trade_history;")
    op.execute("DROP TABLE IF EXISTS instant_trades;")
