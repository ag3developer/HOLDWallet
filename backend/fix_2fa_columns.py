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

# Ver tamanho atual das colunas
print('=== TAMANHO ATUAL DAS COLUNAS ===')
cur.execute("""
SELECT column_name, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'two_factor_auth' 
AND data_type = 'character varying'
""")
for row in cur.fetchall():
    print(f'  {row[0]}: VARCHAR({row[1]})')

print()
print('=== ALTERANDO COLUNAS ===')

# Alterar secret para VARCHAR(500) - secret criptografado é grande
cur.execute("ALTER TABLE two_factor_auth ALTER COLUMN secret TYPE VARCHAR(500)")
print('✅ secret alterado para VARCHAR(500)')

# Alterar backup_codes para VARCHAR(2000) - backup codes criptografados são grandes
cur.execute("ALTER TABLE two_factor_auth ALTER COLUMN backup_codes TYPE VARCHAR(2000)")
print('✅ backup_codes alterado para VARCHAR(2000)')

conn.commit()
print()
print('=== NOVO TAMANHO DAS COLUNAS ===')
cur.execute("""
SELECT column_name, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'two_factor_auth' 
AND data_type = 'character varying'
""")
for row in cur.fetchall():
    print(f'  {row[0]}: VARCHAR({row[1]})')

conn.close()
print()
print('✅ ALTERAÇÕES CONCLUÍDAS!')
