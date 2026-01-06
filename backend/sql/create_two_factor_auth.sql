-- ===========================================
-- Script SQL para criar tabela two_factor_auth
-- Execute este script no banco de produção
-- ===========================================

-- Criar extensão UUID se não existir
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Criar tabela two_factor_auth
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    backup_codes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    enabled_at TIMESTAMP,
    last_used_at TIMESTAMP
);

-- Criar índice para user_id
CREATE INDEX IF NOT EXISTS ix_two_factor_auth_user_id ON two_factor_auth(user_id);

-- Verificar se a tabela foi criada
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'two_factor_auth'
ORDER BY ordinal_position;

-- Mensagem de sucesso
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Tabela two_factor_auth criada com sucesso!';
END $$;
