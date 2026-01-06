import psycopg2

try:
    conn = psycopg2.connect('postgresql://holdwallet-db:AVNS_nUUIAsF6R5bJR3GvmRH@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/defaultdb?sslmode=require')
    cur = conn.cursor()

    # Ver todas as tabelas
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    tables = [t[0] for t in cur.fetchall()]
    print('Tabelas no banco:', tables)
    print()

    # Ver colunas da tabela users
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")
    columns = [col[0] for col in cur.fetchall()]
    print('Colunas na tabela users:', columns)
    print()

    # Buscar usuário
    cur.execute("SELECT * FROM users WHERE email = 'contato@josecarlosmartins.com'")
    user = cur.fetchone()
    if user:
        print('Usuário encontrado!')
        for i, col in enumerate(columns):
            if i < len(user):
                print(f'  {col}: {user[i]}')
    else:
        print('Usuário NÃO encontrado')

    conn.close()
except Exception as e:
    print(f'Erro: {e}')
