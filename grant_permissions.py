#!/usr/bin/env python3
"""
Script para conceder permissões permanentes ao usuário holdwallet-db
Usa o superusuário doadmin para isso
"""
from sqlalchemy import create_engine, text

print("🔐 Concedendo permissões ao holdwallet-db...")
print("   Usando credenciais do doadmin (superusuário)")

# Conectar como doadmin no database correto (holdwallet-db)
DOADMIN_URL = "postgresql://doadmin:AVNS_ar2Nt97JvtVghkpGJFi@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/holdwallet-db?sslmode=require"

try:
    engine = create_engine(DOADMIN_URL, echo=False)
    
    with engine.connect() as conn:
        print("\n✅ Conectado como doadmin!")
        
        # Conceder todas as permissões no schema public
        print("\n🔧 Concedendo permissões no schema public...")
        conn.execute(text('GRANT ALL PRIVILEGES ON SCHEMA public TO "holdwallet-db";'))
        conn.commit()
        print("   ✅ Schema public")
        
        # Conceder permissões em todas as tabelas existentes
        print("\n🔧 Concedendo permissões em tabelas existentes...")
        conn.execute(text('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "holdwallet-db";'))
        conn.commit()
        print("   ✅ Tabelas existentes")
        
        # Conceder permissões em todas as sequences
        print("\n🔧 Concedendo permissões em sequences...")
        conn.execute(text('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "holdwallet-db";'))
        conn.commit()
        print("   ✅ Sequences")
        
        # Conceder permissões padrão para objetos futuros
        print("\n🔧 Configurando permissões padrão para objetos futuros...")
        conn.execute(text('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "holdwallet-db";'))
        conn.commit()
        print("   ✅ Tabelas futuras")
        
        conn.execute(text('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "holdwallet-db";'))
        conn.commit()
        print("   ✅ Sequences futuras")
        
        # Verificar permissões
        print("\n📋 Verificando permissões concedidas...")
        result = conn.execute(text("""
            SELECT grantee, privilege_type 
            FROM information_schema.schema_privileges 
            WHERE schema_name = 'public' AND grantee = 'holdwallet-db'
            ORDER BY privilege_type;
        """))
        
        permissions = [f"{row[0]}: {row[1]}" for row in result]
        if permissions:
            print(f"   ✅ Permissões encontradas: {len(permissions)}")
            for perm in permissions:
                print(f"      - {perm}")
        else:
            print("   ⚠️  Nenhuma permissão encontrada (pode ser normal)")
        
        print("\n🎉 SUCESSO! Permissões concedidas permanentemente!")
        print("\n📝 Próximo passo:")
        print("   Execute: cd /workspace/backend && python -m alembic upgrade head")
        print("   Agora deve funcionar SEM erro de permissão!")

except Exception as e:
    print(f"\n❌ ERRO: {e}")
    import traceback
    traceback.print_exc()
