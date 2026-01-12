#!/usr/bin/env python3
"""
Diagnóstico completo do usuário martins
Verifica todos os dados disponíveis no banco
"""
import os
import psycopg2
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print("=" * 60)
print("DIAGNOSTICO DE DADOS DO USUARIO")
print("=" * 60)

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# 1. Buscar usuário
print("\n1. DADOS DA TABELA 'users':")
print("-" * 40)
cursor.execute("""
    SELECT id, username, email, is_active, is_admin, created_at, last_login
    FROM users 
    WHERE username = 'martins' OR email LIKE '%martins%'
    LIMIT 1
""")
user = cursor.fetchone()
if user:
    user_id = user[0]
    print(f"   id: {user[0]}")
    print(f"   username: {user[1]}")
    print(f"   email: {user[2]}")
    print(f"   is_active: {user[3]}")
    print(f"   is_admin: {user[4]}")
    print(f"   created_at: {user[5]}")
    print(f"   last_login: {user[6]}")
else:
    print("   USUARIO NAO ENCONTRADO!")
    cursor.close()
    conn.close()
    exit()

# 2. Buscar KYC Verification
print("\n2. DADOS DA TABELA 'kyc_verifications':")
print("-" * 40)
cursor.execute("""
    SELECT id, user_id, status, level, created_at, approved_at
    FROM kyc_verifications 
    WHERE user_id = %s
    ORDER BY created_at DESC
""", (user_id,))
kyc_rows = cursor.fetchall()
if kyc_rows:
    for kyc in kyc_rows:
        print(f"   id: {kyc[0]}")
        print(f"   status: {kyc[2]}")
        print(f"   level: {kyc[3]}")
        print(f"   created_at: {kyc[4]}")
        print(f"   approved_at: {kyc[5]}")
        print()
        verification_id = kyc[0]
else:
    print("   NENHUM KYC ENCONTRADO!")
    verification_id = None

# 3. Buscar KYC Personal Data
print("\n3. DADOS DA TABELA 'kyc_personal_data':")
print("-" * 40)
if verification_id:
    cursor.execute("""
        SELECT id, verification_id, full_name, birth_date, phone, city, state, country, occupation, document_type
        FROM kyc_personal_data 
        WHERE verification_id = %s
    """, (verification_id,))
    personal = cursor.fetchone()
    if personal:
        print(f"   id: {personal[0]}")
        print(f"   verification_id: {personal[1]}")
        print(f"   full_name: {personal[2]}")
        print(f"   birth_date: {personal[3]}")
        print(f"   phone: {personal[4]} (criptografado)")
        print(f"   city: {personal[5]}")
        print(f"   state: {personal[6]}")
        print(f"   country: {personal[7]}")
        print(f"   occupation: {personal[8]}")
        print(f"   document_type: {personal[9]}")
    else:
        print("   NENHUM DADO PESSOAL ENCONTRADO!")
else:
    print("   Sem verification_id para buscar")

# 4. Verificar tabela user_settings
print("\n4. DADOS DA TABELA 'user_settings':")
print("-" * 40)
try:
    cursor.execute("""
        SELECT id, user_id, default_currency, theme, language, notifications_enabled
        FROM user_settings 
        WHERE user_id = %s
    """, (user_id,))
    settings = cursor.fetchone()
    if settings:
        print(f"   id: {settings[0]}")
        print(f"   default_currency: {settings[2]}")
        print(f"   theme: {settings[3]}")
        print(f"   language: {settings[4]}")
        print(f"   notifications_enabled: {settings[5]}")
    else:
        print("   NENHUMA CONFIGURACAO ENCONTRADA!")
except Exception as e:
    print(f"   ERRO: {e}")

# 5. Resumo das tabelas existentes
print("\n5. TABELAS NO BANCO:")
print("-" * 40)
cursor.execute("""
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
""")
tables = cursor.fetchall()
for t in tables:
    print(f"   - {t[0]}")

cursor.close()
conn.close()

print("\n" + "=" * 60)
print("CONCLUSAO:")
print("=" * 60)
print("""
Se kyc_personal_data esta vazio, o usuario ainda nao completou
o processo de KYC. A pagina de perfil mostra dados do KYC.

OPCOES:
1. Usuario precisa completar KYC em /kyc
2. Ou admin pode criar dados KYC manualmente
3. Ou a pagina pode mostrar formulario para completar dados

O campo 'Nome Completo' mostra 'martins' porque esta usando
o 'username' como fallback quando full_name esta NULL.
""")
