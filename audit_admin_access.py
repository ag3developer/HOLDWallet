#!/usr/bin/env python3
"""
🔐 AUDITORIA DE SEGURANÇA - admin@wolknow.com
=============================================
Script para verificar tentativas de acesso suspeitas à conta admin.

Author: HOLD Wallet Team
"""

import psycopg2
from datetime import datetime, timedelta

# Conexão com o banco de produção
conn = psycopg2.connect(
    host='app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com',
    port=25060,
    database='holdwallet-db',
    user='holdwallet-db',
    password='AVNS_nUUIAsF6R5bJR3GvmRH',
    sslmode='require'
)
cur = conn.cursor()

TARGET_EMAIL = 'admin@wolknow.com'

print('='*80)
print('🔐 AUDITORIA DE SEGURANÇA - admin@wolknow.com')
print('='*80)
print(f'Data/Hora: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
print('='*80)

# 1. TODAS as tentativas de login para admin@wolknow.com (últimos 30 dias)
print('\n' + '='*80)
print('📋 1. TODAS TENTATIVAS DE LOGIN - admin@wolknow.com (últimos 30 dias)')
print('='*80)
cur.execute("""
    SELECT 
        id,
        email, 
        ip_address, 
        user_agent, 
        success, 
        failure_reason, 
        created_at,
        city,
        country
    FROM login_attempts 
    WHERE LOWER(email) = LOWER(%s)
    AND created_at > NOW() - INTERVAL '30 days'
    ORDER BY created_at DESC
""", (TARGET_EMAIL,))
logins = cur.fetchall()

if logins:
    print(f'\n🔍 Total de tentativas encontradas: {len(logins)}')
    successful = [l for l in logins if l[4]]
    failed = [l for l in logins if not l[4]]
    print(f'   ✅ Sucessos: {len(successful)}')
    print(f'   ❌ Falhas: {len(failed)}')
    
    print('\n--- Detalhes por tentativa ---\n')
    for row in logins:
        status = "✅ SUCESSO" if row[4] else "❌ FALHA"
        print(f'{status}')
        print(f'  📅 Data/Hora: {row[6]}')
        print(f'  🌐 IP: {row[2]}')
        print(f'  📍 Local: {row[7] or "N/A"}, {row[8] or "N/A"}')
        print(f'  🖥️  User-Agent: {row[3][:80] if row[3] else "N/A"}...')
        if not row[4]:
            print(f'  ⚠️  Motivo da falha: {row[5]}')
        print()
else:
    print('Nenhuma tentativa de login encontrada nos últimos 30 dias.')

# 2. IPs ÚNICOS que tentaram acessar admin@wolknow.com
print('\n' + '='*80)
print('🌐 2. IPs ÚNICOS que tentaram acessar admin@wolknow.com')
print('='*80)
cur.execute("""
    SELECT 
        ip_address,
        COUNT(*) as total_attempts,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as fail_count,
        MIN(created_at) as first_attempt,
        MAX(created_at) as last_attempt,
        city,
        country
    FROM login_attempts 
    WHERE LOWER(email) = LOWER(%s)
    GROUP BY ip_address, city, country
    ORDER BY total_attempts DESC
""", (TARGET_EMAIL,))
ips = cur.fetchall()

if ips:
    print(f'\n🔍 Total de IPs únicos: {len(ips)}')
    for row in ips:
        status = "🟢" if row[2] > 0 else "🔴"
        print(f'\n{status} IP: {row[0]}')
        print(f'   📍 Local: {row[6] or "N/A"}, {row[7] or "N/A"}')
        print(f'   📊 Tentativas: {row[1]} (✅ {row[2]} | ❌ {row[3]})')
        print(f'   📅 Primeira: {row[4]}')
        print(f'   📅 Última: {row[5]}')
        
        # Marcar IPs suspeitos
        if row[3] > 3:
            print(f'   ⚠️  ALERTA: Múltiplas falhas de login!')
else:
    print('Nenhum IP encontrado.')

# 3. Verificar ações no audit_logs para admin@wolknow.com
print('\n' + '='*80)
print('📜 3. AUDIT LOGS - Ações da conta admin@wolknow.com (últimos 30 dias)')
print('='*80)
cur.execute("""
    SELECT 
        id,
        created_at,
        user_email,
        action,
        description,
        ip_address,
        user_agent,
        status
    FROM audit_logs 
    WHERE LOWER(user_email) = LOWER(%s)
    AND created_at > NOW() - INTERVAL '30 days'
    ORDER BY created_at DESC
    LIMIT 100
""", (TARGET_EMAIL,))
audit = cur.fetchall()

if audit:
    print(f'\n🔍 Total de ações registradas: {len(audit)}')
    
    # Contar por tipo de ação
    actions = {}
    for row in audit:
        action = row[3]
        actions[action] = actions.get(action, 0) + 1
    
    print('\n📊 Resumo por tipo de ação:')
    for action, count in sorted(actions.items(), key=lambda x: -x[1]):
        print(f'   {action}: {count}')
    
    print('\n--- Últimas 20 ações ---\n')
    for row in audit[:20]:
        print(f'📅 {row[1]}')
        print(f'   🎯 Ação: {row[3]}')
        print(f'   📝 Descrição: {row[4][:100] if row[4] else "N/A"}...')
        print(f'   🌐 IP: {row[5]}')
        print(f'   ✔️  Status: {row[7]}')
        print()
else:
    print('Nenhum registro de auditoria encontrado.')

# 4. Verificar se há tentativas de outros emails para contas admin
print('\n' + '='*80)
print('👥 4. TENTATIVAS DE LOGIN EM CONTAS ADMIN (últimos 7 dias)')
print('='*80)
cur.execute("""
    SELECT la.email, la.ip_address, la.success, la.created_at, la.failure_reason, la.city, la.country
    FROM login_attempts la
    INNER JOIN users u ON LOWER(la.email) = LOWER(u.email)
    WHERE u.is_admin = true
    AND la.created_at > NOW() - INTERVAL '7 days'
    ORDER BY la.created_at DESC
""")
admin_logins = cur.fetchall()

if admin_logins:
    print(f'\n🔍 Total de tentativas em contas admin: {len(admin_logins)}')
    for row in admin_logins:
        status = "✅" if row[2] else "❌"
        print(f'{status} {row[3]} - {row[0]} - IP: {row[1]} - {row[5]}/{row[6]}')
        if not row[2]:
            print(f'   ⚠️  Falha: {row[4]}')
else:
    print('Nenhuma tentativa encontrada.')

# 5. Verificar IPs que tentaram múltiplas contas (possível ataque)
print('\n' + '='*80)
print('🚨 5. IPs SUSPEITOS - Tentaram múltiplas contas (possível ataque)')
print('='*80)
cur.execute("""
    SELECT 
        ip_address,
        COUNT(DISTINCT email) as unique_emails,
        COUNT(*) as total_attempts,
        SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as fail_count,
        STRING_AGG(DISTINCT email, ', ') as emails_tried,
        MAX(city) as city,
        MAX(country) as country
    FROM login_attempts 
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY ip_address
    HAVING COUNT(DISTINCT email) > 1
    ORDER BY unique_emails DESC
""")
suspicious = cur.fetchall()

if suspicious:
    print(f'\n⚠️  IPs que tentaram múltiplas contas: {len(suspicious)}')
    for row in suspicious:
        print(f'\n🔴 IP: {row[0]}')
        print(f'   📍 Local: {row[5] or "N/A"}, {row[6] or "N/A"}')
        print(f'   👥 Contas diferentes: {row[1]}')
        print(f'   📊 Total tentativas: {row[2]} (❌ {row[3]} falhas)')
        print(f'   📧 Emails tentados: {row[4][:100]}...' if len(row[4]) > 100 else f'   📧 Emails tentados: {row[4]}')
else:
    print('✅ Nenhum IP suspeito encontrado.')

# 6. Últimas sessões ativas
print('\n' + '='*80)
print('🔑 6. INFORMAÇÕES DA CONTA admin@wolknow.com')
print('='*80)
cur.execute("""
    SELECT 
        id,
        email,
        username,
        is_admin,
        is_active,
        created_at,
        last_login,
        updated_at
    FROM users 
    WHERE LOWER(email) = LOWER(%s)
""", (TARGET_EMAIL,))
user = cur.fetchone()

if user:
    print(f'\n👤 ID: {user[0]}')
    print(f'📧 Email: {user[1]}')
    print(f'👤 Username: {user[2]}')
    print(f'👑 É Admin: {"Sim" if user[3] else "Não"}')
    print(f'✅ Ativo: {"Sim" if user[4] else "Não"}')
    print(f'📅 Conta criada: {user[5]}')
    print(f'🔐 Último login: {user[6]}')
    print(f'📝 Última atualização: {user[7]}')
else:
    print('⚠️  Usuário não encontrado!')

# 7. Verificar se houve alteração de senha recentemente
print('\n' + '='*80)
print('🔐 7. VERIFICAR ALTERAÇÕES SENSÍVEIS NO AUDIT LOG')
print('='*80)
cur.execute("""
    SELECT created_at, action, description, ip_address, status
    FROM audit_logs 
    WHERE LOWER(user_email) = LOWER(%s)
    AND (
        LOWER(action) LIKE '%password%' 
        OR LOWER(action) LIKE '%senha%'
        OR LOWER(action) LIKE '%2fa%'
        OR LOWER(action) LIKE '%mfa%'
        OR LOWER(action) LIKE '%security%'
        OR LOWER(action) LIKE '%permission%'
        OR LOWER(action) LIKE '%admin%'
    )
    ORDER BY created_at DESC
""", (TARGET_EMAIL,))
sensitive = cur.fetchall()

if sensitive:
    print(f'\n⚠️  Ações sensíveis encontradas: {len(sensitive)}')
    for row in sensitive:
        print(f'\n📅 {row[0]}')
        print(f'   🎯 Ação: {row[1]}')
        print(f'   📝 Descrição: {row[2]}')
        print(f'   🌐 IP: {row[3]}')
else:
    print('✅ Nenhuma ação sensível encontrada.')

# Fechar conexão
cur.close()
conn.close()

print('\n' + '='*80)
print('✅ AUDITORIA CONCLUÍDA')
print('='*80)
