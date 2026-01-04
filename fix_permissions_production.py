#!/usr/bin/env python3
"""
Concede permissões necessárias ao usuário do banco de produção
"""

from sqlalchemy import create_engine, text
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# PostgreSQL Produção - usar o usuário ADMIN (doadmin) ao invés do usuário da aplicação
ADMIN_DB = (
    "postgresql://doadmin:AVNS_nUUIAsF6R5bJR3GvmRH@"
    "app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/"
    "holdwallet-db?sslmode=require"
)

def main():
    print("\n" + "=" * 80)
    print("🔐 CONCEDENDO PERMISSÕES AO USUÁRIO DO BANCO")
    print("=" * 80)
    
    try:
        print("\n🔌 Conectando como doadmin...")
        engine = create_engine(ADMIN_DB, echo=False)
        
        with engine.connect() as conn:
            # Testar conexão
            result = conn.execute(text("SELECT current_user, current_database()"))
            row = result.fetchone()
            print(f"   ✅ Conectado como: {row[0]}")
            print(f"   ✅ Database: {row[1]}")
            
            print("\n🔐 Concedendo permissões ao usuário 'holdwallet-db'...")
            
            # Comandos SQL para dar permissões
            comandos = [
                # Permissões no database
                "GRANT ALL PRIVILEGES ON DATABASE \"holdwallet-db\" TO \"holdwallet-db\"",
                
                # Permissões no schema public
                "GRANT ALL PRIVILEGES ON SCHEMA public TO \"holdwallet-db\"",
                "GRANT CREATE ON SCHEMA public TO \"holdwallet-db\"",
                
                # Permissões em todas as tabelas existentes e futuras
                "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"holdwallet-db\"",
                "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"holdwallet-db\"",
                
                # Permissões default para objetos futuros
                "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"holdwallet-db\"",
                "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO \"holdwallet-db\"",
                "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO \"holdwallet-db\"",
                
                # Permissão para criar tipos (ENUM)
                "ALTER ROLE \"holdwallet-db\" CREATEDB",
            ]
            
            for i, cmd in enumerate(comandos, 1):
                try:
                    conn.execute(text(cmd))
                    conn.commit()
                    print(f"   ✅ [{i}/{len(comandos)}] {cmd[:60]}...")
                except Exception as e:
                    print(f"   ⚠️  [{i}/{len(comandos)}] Erro (pode ser ignorado): {str(e)[:50]}...")
            
            print("\n✅ Permissões concedidas com sucesso!")
            
            # Verificar permissões
            print("\n🔍 Verificando permissões do usuário 'holdwallet-db'...")
            result = conn.execute(text("""
                SELECT 
                    has_schema_privilege('holdwallet-db', 'public', 'CREATE') as can_create_schema,
                    has_schema_privilege('holdwallet-db', 'public', 'USAGE') as can_use_schema
            """))
            row = result.fetchone()
            print(f"   CREATE no schema public: {'✅ SIM' if row[0] else '❌ NÃO'}")
            print(f"   USAGE no schema public: {'✅ SIM' if row[1] else '❌ NÃO'}")
        
        print("\n" + "=" * 80)
        print("🎉 PERMISSÕES CONFIGURADAS!")
        print("=" * 80)
        print("\n📝 Agora execute:")
        print("   python create_tables_production.py")
        print("=" * 80 + "\n")
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        print("\n💡 SOLUÇÃO ALTERNATIVA:")
        print("   1. Acesse o Digital Ocean Dashboard")
        print("   2. Vá em Databases > holdwallet-db")
        print("   3. Abra o 'Console' SQL")
        print("   4. Execute estes comandos:")
        print()
        print("   GRANT ALL PRIVILEGES ON SCHEMA public TO \"holdwallet-db\";")
        print("   GRANT CREATE ON SCHEMA public TO \"holdwallet-db\";")
        print("   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"holdwallet-db\";")
        print("   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO \"holdwallet-db\";")
        print()
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
