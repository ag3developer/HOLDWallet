"""
Script de teste para inserir e testar limites globais no banco.
"""
import asyncio
import sys
import os
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def insert_test_limit():
    """Insere um limite de teste para wolkpay nível advanced"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Limpa qualquer limite existente para teste
        conn.execute(text("""
            DELETE FROM kyc_service_limits 
            WHERE service_name = 'wolkpay' AND kyc_level = 'advanced'
        """))
        
        # Insere novo limite (alterado pelo admin)
        conn.execute(text("""
            INSERT INTO kyc_service_limits 
            (id, service_name, kyc_level, daily_limit, monthly_limit, per_operation_limit, is_active, created_at)
            VALUES 
            (gen_random_uuid(), 'wolkpay', 'advanced', 200000, 2000000, 100000, true, now())
        """))
        
        conn.commit()
        
        print("✅ Limite de teste inserido para wolkpay/advanced:")
        print("   - Diário: R$ 200.000")
        print("   - Mensal: R$ 2.000.000")
        print("   - Por operação: R$ 100.000")


async def test_new_limit():
    """Testa se o novo limite é usado"""
    from app.core.db import SessionLocal
    from app.services.kyc_service import KYCService
    import uuid
    
    db = SessionLocal()
    try:
        kyc_service = KYCService(db)
        test_user_id = uuid.UUID("cc98ade4-7d50-48f0-95cd-ff69cb24c259")
        
        limits = await kyc_service.get_user_limits(test_user_id)
        wolkpay = limits.get("wolkpay", {})
        
        print("\n📊 Limite WolkPay após configuração:")
        print(f"   - Limite diário: R$ {wolkpay.get('daily_limit_brl'):,.2f}" if wolkpay.get('daily_limit_brl') else "   - Limite diário: Ilimitado")
        print(f"   - Limite mensal: R$ {wolkpay.get('monthly_limit_brl'):,.2f}" if wolkpay.get('monthly_limit_brl') else "   - Limite mensal: Ilimitado")
        print(f"   - Limite por operação: R$ {wolkpay.get('transaction_limit_brl'):,.2f}" if wolkpay.get('transaction_limit_brl') else "   - Limite por operação: Ilimitado")
        
        # Verifica se pegou do banco
        if wolkpay.get('transaction_limit_brl') == Decimal('100000'):
            print("\n✅ Limite correto! Usando configuração do banco (admin)")
        else:
            print(f"\n⚠️ Limite não veio do banco. Valor: {wolkpay.get('transaction_limit_brl')}")
            
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("🧪 TESTE DE CONFIGURAÇÃO GLOBAL DE LIMITES")
    print("=" * 60)
    
    insert_test_limit()
    asyncio.run(test_new_limit())
    
    print("\n" + "=" * 60)
    print("✅ Teste concluído!")
