"""
Script para criar tabela webauthn_credentials no banco de produção
"""
import psycopg2

conn = psycopg2.connect(
    host='app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com',
    port=25060,
    user='holdwallet-db',
    password='AVNS_nUUIAsF6R5bJR3GvmRH',
    dbname='holdwallet-db',
    sslmode='require'
)
cur = conn.cursor()

# Criar tabela webauthn_credentials
print('=== CRIANDO TABELA webauthn_credentials ===')

cur.execute("""
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    sign_count VARCHAR(50) DEFAULT '0',
    authenticator_type VARCHAR(50) DEFAULT 'platform',
    device_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP
);
""")

# Criar índices
cur.execute("""
CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON webauthn_credentials(user_id);
""")

cur.execute("""
CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id ON webauthn_credentials(credential_id);
""")

conn.commit()
print('✅ Tabela webauthn_credentials criada!')

# Verificar
cur.execute("""
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'webauthn_credentials'
ORDER BY ordinal_position
""")
print('\nColunas da tabela:')
for row in cur.fetchall():
    print(f'  {row[0]}: {row[1]}')

conn.close()
print('\n✅ TABELA CRIADA COM SUCESSO!')
