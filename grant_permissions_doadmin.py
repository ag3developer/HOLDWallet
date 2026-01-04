#!/usr/bin/env python3
"""
Script para conceder permissões usando doadmin e depois executar migrations
EXECUTE ESTE SCRIPT NO CONSOLE DO DIGITAL OCEAN
"""
from sqlalchemy import create_engine, text
import sys

print("=" * 60)
print("🔧 SCRIPT DE CONFIGURAÇÃO DE PERMISSÕES")
print("=" * 60)

# Credenciais do doadmin
DOADMIN_URL = "postgresql://doadmin:AVNS_ar2Nt97JvtVghkpGJFi@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/holdwallet-db?sslmode=require"

print("\n📋 Passo 1: Conectando como doadmin...")
try:
    engine = create_engine(DOADMIN_URL, echo=False)
    with engine.connect() as conn:
        print("   ✅ Conectado com sucesso!")
        
        print("\n🔧 Passo 2: Concedendo permissões ao holdwallet-db...")
        
        # Conceder todas as permissões no schema public
        conn.execute(text('GRANT ALL PRIVILEGES ON SCHEMA public TO "holdwallet-db";'))
        print("   ✅ Permissões no schema concedidas")
        
        # Conceder permissões em todas as tabelas existentes
        conn.execute(text('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "holdwallet-db";'))
        print("   ✅ Permissões em tabelas existentes concedidas")
        
        # Conceder permissões em todas as sequences
        conn.execute(text('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "holdwallet-db";'))
        print("   ✅ Permissões em sequences concedidas")
        
        # Definir permissões padrão para tabelas futuras
        conn.execute(text('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "holdwallet-db";'))
        print("   ✅ Permissões padrão para tabelas futuras definidas")
        
        # Definir permissões padrão para sequences futuras
        conn.execute(text('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "holdwallet-db";'))
        print("   ✅ Permissões padrão para sequences futuras definidas")
        
        conn.commit()
        
        print("\n✅ Passo 3: Verificando permissões...")
        result = conn.execute(text("""
            SELECT 
                grantee,
                privilege_type
            FROM information_schema.role_table_grants 
            WHERE grantee = 'holdwallet-db' 
            AND table_schema = 'public'
            LIMIT 5;
        """))
        
        perms = list(result)
        if perms:
            print(f"   ✅ Encontradas {len(perms)} permissões para holdwallet-db")
        else:
            print("   ⚠️  Nenhuma tabela existe ainda, mas permissões foram definidas")
        
        print("\n" + "=" * 60)
        print("🎉 SUCESSO! Permissões concedidas com sucesso!")
        print("=" * 60)
        print("\n📝 PRÓXIMO PASSO:")
        print("   Execute: cd /workspace/backend && python -m alembic upgrade head")
        print("\n   Agora o Alembic DEVE funcionar! ✅")
        
except Exception as e:
    print(f"\n❌ ERRO: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
