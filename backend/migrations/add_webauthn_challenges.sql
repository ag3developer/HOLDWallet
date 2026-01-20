-- Criação da tabela webauthn_challenges para armazenar challenges temporários
-- Necessário para funcionar com múltiplos workers em produção

CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    challenge_type VARCHAR(20) NOT NULL DEFAULT 'registration',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índice para busca rápida por user_id
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id ON webauthn_challenges(user_id);

-- Índice para limpeza de challenges expirados
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at ON webauthn_challenges(expires_at);

-- Comentário na tabela
COMMENT ON TABLE webauthn_challenges IS 'Armazena challenges WebAuthn temporários para registro e autenticação biométrica';
