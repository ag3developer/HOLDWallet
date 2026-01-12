"""
Script de teste para verificar se os limites KYC estão sendo consultados corretamente.
"""
import asyncio
import sys
import os

# Adiciona o diretório backend ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def test_tables_exist():
    """Verifica se as tabelas de limites existem"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Lista tabelas
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('kyc_service_limits', 'user_custom_limits', 'user_service_access')
            ORDER BY table_name
        """))
        
        tables = [row[0] for row in result]
        print("\n📋 Tabelas de limites KYC:")
        print(f"   - kyc_service_limits: {'✅ Existe' if 'kyc_service_limits' in tables else '❌ Não existe'}")
        print(f"   - user_custom_limits: {'✅ Existe' if 'user_custom_limits' in tables else '❌ Não existe'}")
        print(f"   - user_service_access: {'✅ Existe' if 'user_service_access' in tables else '❌ Não existe'}")
        
        # Se kyc_service_limits existe, mostra configurações
        if 'kyc_service_limits' in tables:
            result = conn.execute(text("""
                SELECT service_name, kyc_level, daily_limit, monthly_limit, per_operation_limit, is_active
                FROM kyc_service_limits
                ORDER BY service_name, kyc_level
            """))
            
            rows = list(result)
            print(f"\n📊 Limites configurados no banco ({len(rows)} registros):")
            if rows:
                for row in rows:
                    service, level, daily, monthly, per_op, active = row
                    print(f"   - {service}/{level}: diário={daily}, mensal={monthly}, por_op={per_op}, ativo={active}")
            else:
                print("   (Nenhum limite configurado - usando defaults)")
        
        # Verifica se há limites personalizados
        if 'user_custom_limits' in tables:
            result = conn.execute(text("""
                SELECT COUNT(*) FROM user_custom_limits
            """))
            count = result.scalar()
            print(f"\n👤 Limites personalizados por usuário: {count} registros")
        
        # Verifica se há restrições de acesso
        if 'user_service_access' in tables:
            result = conn.execute(text("""
                SELECT COUNT(*) FROM user_service_access
            """))
            count = result.scalar()
            print(f"\n🔒 Controles de acesso a serviços: {count} registros")


async def test_kyc_service_limits():
    """Testa o método get_user_limits do KYCService"""
    from app.core.db import SessionLocal
    from app.services.kyc_service import KYCService
    import uuid
    
    db = SessionLocal()
    try:
        kyc_service = KYCService(db)
        
        # Usa um UUID de teste
        test_user_id = uuid.UUID("cc98ade4-7d50-48f0-95cd-ff69cb24c259")  # martins
        
        print(f"\n🧪 Testando get_user_limits para usuário: {test_user_id}")
        
        limits = await kyc_service.get_user_limits(test_user_id)
        
        print("\n📊 Limites retornados:")
        for service, service_limits in limits.items():
            print(f"\n   {service}:")
            print(f"      - Limite diário: {service_limits.get('daily_limit_brl')}")
            print(f"      - Limite mensal: {service_limits.get('monthly_limit_brl')}")
            print(f"      - Limite por operação: {service_limits.get('transaction_limit_brl')}")
            print(f"      - Habilitado: {service_limits.get('is_enabled')}")
            print(f"      - Nível KYC: {service_limits.get('kyc_level')}")
            print(f"      - É personalizado: {service_limits.get('is_custom')}")
            
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("🔍 TESTE DE LIMITES KYC")
    print("=" * 60)
    
    test_tables_exist()
    
    print("\n" + "=" * 60)
    
    asyncio.run(test_kyc_service_limits())
    
    print("\n" + "=" * 60)
    print("✅ Teste concluído!")
