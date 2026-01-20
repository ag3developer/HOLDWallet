import psycopg2
from datetime import datetime, timedelta

conn = psycopg2.connect(
    host='app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com',
    port=25060,
    database='holdwallet-db',
    user='holdwallet-db',
    password='AVNS_nUUIAsF6R5bJR3GvmRH',
    sslmode='require'
)
cur = conn.cursor()

print('='*80)
print('🚨 INVESTIGACAO DE SEGURANCA - TRANSFERENCIA NAO AUTORIZADA 🚨')
print('='*80)

# 1. TODOS os logins nas ultimas 24 horas
print('\n=== TODOS LOGINS (24h) ===')
cur.execute("""
    SELECT email, ip_address, user_agent, success, failure_reason, created_at, city, country
    FROM login_attempts 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
""")
r = cur.fetchall()
for row in r:
    status = "✅" if row[3] else "❌"
    print(f'  {status} {row[5]} - {row[0]} - IP: {row[1]} - {row[6]}/{row[7]}')
    if not row[3]:
        print(f'      Falha: {row[4]}')

# 2. Audit logs nas ultimas 24h
print('\n=== AUDIT LOGS (24h) ===')
cur.execute("""
    SELECT created_at, user_email, action, description, ip_address, user_agent, status
    FROM audit_logs 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
""")
r = cur.fetchall()
for row in r:
    print(f'  {row[0]} - {row[1]} - {row[2]} - {row[3][:50] if row[3] else "N/A"}...')
    print(f'      IP: {row[4]}')

# 3. Verificar se ha acesso de IPs diferentes do usual
print('\n=== IPS UNICOS NAS ULTIMAS 24H ===')
cur.execute("""
    SELECT DISTINCT ip_address, email, COUNT(*) as count
    FROM login_attempts 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY ip_address, email
    ORDER BY count DESC
""")
r = cur.fetchall()
for row in r:
    print(f'  IP: {row[0]} - {row[1]} - {row[2]} acessos')

# 4. Verificar usuarios com is_admin = true
print('\n=== TODOS USUARIOS ADMIN ===')
cur.execute("""
    SELECT id, email, username, is_admin, created_at, last_login, is_active
    FROM users 
    WHERE is_admin = true
""")
r = cur.fetchall()
for row in r:
    print(f'  ID: {row[0]}')
    print(f'    Email: {row[1]}, Username: {row[2]}')
    print(f'    Criado: {row[4]}, Ultimo Login: {row[5]}')
    print(f'    Ativo: {row[6]}')

# 5. Verificar se houve alteracao de usuarios recentemente
print('\n=== ALTERACOES DE USUARIOS (ultimos 7 dias) ===')
cur.execute("""
    SELECT id, email, username, is_admin, updated_at, created_at
    FROM users 
    WHERE updated_at > NOW() - INTERVAL '7 days'
    ORDER BY updated_at DESC
""")
r = cur.fetchall()
for row in r:
    print(f'  {row[4]} - {row[1]} - is_admin: {row[3]}')

# 6. Buscar QUALQUER referencia ao endereco suspeito
print('\n=== BUSCA COMPLETA: 0x763D460bD420111f1b539ce175f7A769b2cAB39E ===')
addr = '0x763D460bD420111f1b539ce175f7A769b2cAB39E'
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
tables = [t[0] for t in cur.fetchall()]

for table in tables:
    try:
        # Buscar em todas as colunas de texto
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND data_type IN ('text', 'character varying', 'varchar')")
        cols = [c[0] for c in cur.fetchall()]
        for col in cols:
            try:
                cur.execute(f"SELECT * FROM {table} WHERE LOWER(CAST({col} AS TEXT)) LIKE LOWER('%{addr}%')")
                r = cur.fetchall()
                if r:
                    print(f'\n  🔴 ENCONTRADO em {table}.{col}:')
                    for row in r:
                        print(f'    {row}')
            except:
                pass
    except:
        pass

# 7. Verificar se a private key foi exposta em logs
print('\n=== VERIFICAR EXPOSICAO DE CHAVES ===')
# Verificar se ha alguma coluna com 'key' ou 'secret' ou 'private'
for table in tables:
    try:
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND (column_name LIKE '%key%' OR column_name LIKE '%secret%' OR column_name LIKE '%private%')")
        cols = cur.fetchall()
        if cols:
            print(f'  Tabela {table} tem colunas sensiveis: {[c[0] for c in cols]}')
    except:
        pass

# 8. Verificar system_blockchain_wallets
print('\n=== SYSTEM_BLOCKCHAIN_WALLETS (carteiras do sistema) ===')
cur.execute("SELECT * FROM system_blockchain_wallets")
r = cur.fetchall()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_blockchain_wallets'")
cols = [c[0] for c in cur.fetchall()]
print(f'  Colunas: {cols}')
for row in r:
    print(f'  {row}')

# 9. Verificar system_blockchain_addresses
print('\n=== SYSTEM_BLOCKCHAIN_ADDRESSES ===')
cur.execute("SELECT * FROM system_blockchain_addresses")
r = cur.fetchall()
for row in r:
    print(f'  {row}')

# 10. Verificar tokens de sessao ativos
print('\n=== VERIFICAR SESSOES/TOKENS ===')
for table in ['sessions', 'user_sessions', 'refresh_tokens', 'access_tokens']:
    try:
        cur.execute(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table}')")
        if cur.fetchone()[0]:
            print(f'\n  Tabela {table}:')
            cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
            cols = [c[0] for c in cur.fetchall()]
            print(f'    Colunas: {cols}')
            cur.execute(f"SELECT * FROM {table} ORDER BY id DESC LIMIT 5")
            for row in cur.fetchall():
                print(f'    {row}')
    except:
        pass

conn.close()
print('\n' + '='*80)
print('INVESTIGACAO FINALIZADA')
print('='*80)

# 3. Buscar a TX especifica em TODAS as tabelas
print('\n=== BUSCA: TX ' + tx_hash[:20] + '... ===')
cur.execute("""
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public'
""")
tables = [t[0] for t in cur.fetchall()]

for table in tables:
    try:
        # Verificar se a tabela tem tx_hash
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND column_name = 'tx_hash'")
        if cur.fetchone():
            cur.execute(f"SELECT * FROM {table} WHERE tx_hash = %s", (tx_hash,))
            r = cur.fetchall()
            if r:
                print(f'\n  ENCONTRADO em {table}:')
                cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
                cols = [c[0] for c in cur.fetchall()]
                print(f'    Colunas: {cols}')
                for row in r:
                    print(f'    -> {row}')
    except:
        pass

# 4. Buscar pelo endereco destino
print('\n=== BUSCA: Endereco ' + addr[:20] + '... ===')
for table in tables:
    try:
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND column_name IN ('to_address', 'recipient_address', 'destination_address', 'address')")
        cols = cur.fetchall()
        if cols:
            for col in cols:
                cur.execute(f"SELECT * FROM {table} WHERE LOWER({col[0]}) = LOWER(%s)", (addr,))
                r = cur.fetchall()
                if r:
                    print(f'\n  ENCONTRADO em {table}.{col[0]}:')
                    for row in r:
                        print(f'    -> {row}')
    except:
        pass

# 5. Tabelas de log/audit
print('\n=== TABELAS DE LOG/AUDIT/ACTIVITY ===')
cur.execute("""
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name LIKE '%log%' OR table_name LIKE '%audit%' OR table_name LIKE '%history%' OR table_name LIKE '%activity%')
""")
r = cur.fetchall()
for row in r:
    table = row[0]
    print(f'\n  Tabela: {table}')
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
    cols = [c[0] for c in cur.fetchall()]
    print(f'    Colunas: {cols}')
    try:
        cur.execute(f"SELECT * FROM {table} ORDER BY id DESC LIMIT 10")
        recs = cur.fetchall()
        if recs:
            for rec in recs:
                print(f'    -> {rec}')
    except:
        pass

# 6. Transacoes recentes (ultimas 24h para ter certeza)
print('\n=== TODAS TRANSACOES RECENTES (24h) ===')
cur.execute("""
    SELECT * FROM transactions 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 20
""")
r = cur.fetchall()
if r:
    for row in r:
        print(f'  {row}')
else:
    print('  Nenhuma em transactions')

cur.execute("""
    SELECT * FROM system_wallet_transactions 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 20
""")
r = cur.fetchall()
if r:
    print('\n  system_wallet_transactions:')
    for row in r:
        print(f'    {row}')
else:
    print('  Nenhuma em system_wallet_transactions')

# 7. Verificar wolkpay
print('\n=== INSTANT_TRADE_HISTORY (detalhado) ===')
cur.execute("""
    SELECT * FROM instant_trade_history
    WHERE created_at > NOW() - INTERVAL '2 hours'
    ORDER BY created_at DESC
""")
r = cur.fetchall()
if r:
    for row in r:
        print(f'  {row}')
else:
    print('  Nenhuma')

# Ver detalhes do trade que enviou para 0x763D460bD420111f1b539ce175f7A769b2cAB39E
print('\n=== DETALHES DO ADMIN SEND (instant_trades) ===')
cur.execute("""
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'instant_trades'
""")
cols = [c[0] for c in cur.fetchall()]
print(f'  Colunas: {cols}')

cur.execute("""
    SELECT * FROM instant_trades 
    WHERE created_at > NOW() - INTERVAL '3 hours'
    ORDER BY created_at DESC
""")
r = cur.fetchall()
if r:
    for row in r:
        print(f'\n  {row}')
else:
    print('  Nenhum trade recente')

# Verificar se o TX Hash 0x15fa82... existe em algum lugar
print('\n=== BUSCA FINAL: TX 0x15fa82c01ff0258def77e0b81b735d41fe34a825cd2ef5832d4cc9c92086c839 ===')
cur.execute("""
    SELECT * FROM transactions 
    WHERE tx_hash = '0x15fa82c01ff0258def77e0b81b735d41fe34a825cd2ef5832d4cc9c92086c839'
""")
r = cur.fetchall()
print(f'  Em transactions: {r if r else "NAO ENCONTRADO"}')

cur.execute("""
    SELECT * FROM instant_trades 
    WHERE tx_hash = '0x15fa82c01ff0258def77e0b81b735d41fe34a825cd2ef5832d4cc9c92086c839'
""")
r = cur.fetchall()
print(f'  Em instant_trades: {r if r else "NAO ENCONTRADO"}')

# 8. Verificar se o endereco pertence a algum usuario
print('\n=== ENDERECO PERTENCE A USUARIO? ===')
cur.execute("""
    SELECT a.id, a.address, a.network, w.user_id, u.email, u.username
    FROM addresses a 
    LEFT JOIN wallets w ON a.wallet_id = w.id 
    LEFT JOIN users u ON w.user_id = u.id
    WHERE LOWER(a.address) = LOWER(%s)
""", (addr,))
r = cur.fetchall()
if r:
    print('  SIM! Endereco pertence a:')
    for row in r:
        print(f'    Address ID: {row[0]}, Network: {row[2]}')
        print(f'    User ID: {row[3]}, Email: {row[4]}, Username: {row[5]}')
else:
    print('  NAO encontrado em addresses de usuarios')

conn.close()
print('\n' + '='*80)
print('AUDITORIA FINALIZADA')
print('='*80)
