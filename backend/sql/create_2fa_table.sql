-- ============================================
-- Script para criar tabela two_factor_auth
-- Execute no painel do DigitalOcean Database
-- ============================================

-- 1. Verificar se a tabela já existe
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'two_factor_auth'
) AS tabela_existe;

-- 2. Criar a tabela (se não existir)
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    backup_codes VARCHAR(1000),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    enabled_at TIMESTAMP,
    last_used_at TIMESTAMP
);

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS ix_two_factor_auth_user_id ON two_factor_auth(user_id);

-- 4. Verificar se a tabela foi criada
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'two_factor_auth'
ORDER BY ordinal_position;

-- 5. Confirmar sucesso
SELECT 'Tabela two_factor_auth criada com sucesso!' AS resultado;
