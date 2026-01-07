-- Script para criar tabela biometric_tokens
-- Execute este script no servidor de produção

-- Criar tabela biometric_tokens
CREATE TABLE IF NOT EXISTS biometric_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS ix_biometric_tokens_id ON biometric_tokens(id);
CREATE INDEX IF NOT EXISTS ix_biometric_tokens_token ON biometric_tokens(token);
CREATE INDEX IF NOT EXISTS ix_biometric_tokens_user_id ON biometric_tokens(user_id);

-- Comentário na tabela
COMMENT ON TABLE biometric_tokens IS 'Armazena tokens biométricos temporários para autorização de transações';

-- Verificar se a tabela foi criada
SELECT 'Tabela biometric_tokens criada com sucesso!' AS status;
