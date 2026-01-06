import psycopg2

# Conectar ao banco holdwallet-db (não defaultdb)
conn = psycopg2.connect(
    host='app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com',
    port=25060,
    user='holdwallet-db',
    password='AVNS_nUUIAsF6R5bJR3GvmRH',
    dbname='holdwallet-db',
    sslmode='require'
)
cur = conn.cursor()

# Ver colunas da tabela users
print('=== COLUNAS DA TABELA users ===')
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")
for c in cur.fetchall():
    print(f'  {c[0]}')
print()

# Ver colunas da tabela two_factor_auth
print('=== COLUNAS DA TABELA two_factor_auth ===')
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'two_factor_auth' ORDER BY ordinal_position")
for c in cur.fetchall():
    print(f'  {c[0]}')
print()

# Ver usuarios
print('=== USUARIOS ===')
cur.execute('SELECT id, email, is_active, created_at FROM users')
for u in cur.fetchall():
    print(f'Email: {u[1]} | Ativo: {u[2]} | Criado: {u[3]}')

conn.close()
