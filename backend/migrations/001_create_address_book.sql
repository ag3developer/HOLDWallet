-- Migration: Create Address Book Table
-- Version: 001
-- Description: Criar tabela para agenda de endereços salvos

-- Criar ENUMs primeiro
DO $$ BEGIN
    CREATE TYPE wallettype AS ENUM (
        'binance', 'bitget', 'bybit', 'coinbase', 'kraken', 'kucoin', 'okx', 'gate.io', 
        'huobi', 'mexc', 'bitfinex', 'gemini', 'crypto.com',
        'metamask', 'trust_wallet', 'bitget_wallet', 'phantom', 'exodus', 'ledger', 
        'trezor', 'coinbase_wallet', 'rainbow', 'zerion', 'rabby', 'argent', 'safe',
        'personal', 'friend', 'business', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE walletcategory AS ENUM ('exchange', 'wallet', 'personal', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela address_book
CREATE TABLE IF NOT EXISTS address_book (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Informações do contato
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    
    -- Rede blockchain
    network VARCHAR(50) NOT NULL,
    
    -- Tipo de carteira/destino
    wallet_type wallettype DEFAULT 'other' NOT NULL,
    wallet_category walletcategory DEFAULT 'other' NOT NULL,
    
    -- Informações adicionais
    memo VARCHAR(255),
    notes TEXT,
    
    -- Controle
    is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    use_count INTEGER DEFAULT 0 NOT NULL,
    last_used_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_address_book_user_id ON address_book(user_id);
CREATE INDEX IF NOT EXISTS idx_address_book_address ON address_book(address);
CREATE INDEX IF NOT EXISTS idx_address_book_network ON address_book(network);
CREATE INDEX IF NOT EXISTS idx_address_book_wallet_category ON address_book(wallet_category);

-- Índice único para evitar duplicatas (mesmo usuário, endereço e rede)
CREATE UNIQUE INDEX IF NOT EXISTS idx_address_book_unique 
ON address_book(user_id, LOWER(address), network);

-- Comentários
COMMENT ON TABLE address_book IS 'Agenda de endereços salvos pelos usuários';
COMMENT ON COLUMN address_book.name IS 'Nome/apelido dado ao endereço';
COMMENT ON COLUMN address_book.address IS 'Endereço blockchain';
COMMENT ON COLUMN address_book.network IS 'Rede blockchain (ethereum, polygon, bitcoin, etc)';
COMMENT ON COLUMN address_book.wallet_type IS 'Tipo de carteira/exchange de destino';
COMMENT ON COLUMN address_book.wallet_category IS 'Categoria do tipo de carteira';
COMMENT ON COLUMN address_book.memo IS 'Memo/Tag para redes que precisam (XRP, BNB, etc)';
COMMENT ON COLUMN address_book.notes IS 'Notas/observações do usuário';
COMMENT ON COLUMN address_book.is_favorite IS 'Se o endereço é favorito';
COMMENT ON COLUMN address_book.is_verified IS 'Se o usuário verificou o endereço';
COMMENT ON COLUMN address_book.use_count IS 'Quantas vezes o endereço foi usado';
COMMENT ON COLUMN address_book.last_used_at IS 'Última vez que o endereço foi usado';
