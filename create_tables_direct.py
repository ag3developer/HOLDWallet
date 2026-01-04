#!/usr/bin/env python3
"""
Script para criar tabelas diretamente no banco de produção
"""
import sys
import os

# Adicionar o diretório backend ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Importar Base do lugar correto!
from app.core.db import Base

print("✅ Base imported from app.core.db")

# Importar TODOS os models necessários
try:
    from app.models.user import User
    print("✅ User model imported")
except Exception as e:
    print(f"❌ CRITICAL - user: {e}")
    sys.exit(1)

try:
    from app.models.wallet import Wallet
    print("✅ wallet models imported")
except Exception as e:
    print(f"⚠️  wallet: {e}")

try:
    from app.models.balance import WalletBalance, BalanceHistory
    print("✅ balance models imported")
except Exception as e:
    print(f"⚠️  balance: {e}")

try:
    from app.models.p2p import P2POrder, P2PMatch, P2PEscrow, P2PDispute
    print("✅ p2p models imported")
except Exception as e:
    print(f"⚠️  p2p: {e}")

try:
    from app.models.reputation import UserReputation, UserReview
    print("✅ reputation models imported")
except Exception as e:
    print(f"⚠️  reputation: {e}")

try:
    from app.models.trader_profile import TraderProfile, TraderStats
    print("✅ trader_profile models imported")
except Exception as e:
    print(f"⚠️  trader_profile: {e}")

try:
    from app.models.instant_trade import InstantTrade, InstantTradeHistory
    print("✅ instant_trade models imported")
except Exception as e:
    print(f"⚠️  instant_trade: {e}")

try:
    from app.models.chat import ChatMessage, ChatSession, ChatRoom
    print("✅ chat models imported")
except Exception as e:
    print(f"⚠️  chat: {e}")

try:
    from app.models.two_factor import TwoFactorAuth
    print("✅ two_factor models imported")
except Exception as e:
    print(f"⚠️  two_factor: {e}")

print("✅ Import phase completed!")

# String de conexão do banco de produção
DATABASE_URL = (
    "postgresql://holdwallet-db:AVNS_nUUIAsF6R5bJR3GvmRH@"
    "app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/"
    "holdwallet-db?sslmode=require"
)

def main():
    print("🔗 Conectando ao banco de produção...")
    
    try:
        # Criar engine
        engine = create_engine(DATABASE_URL, echo=True)
        
        # Testar conexão
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"✅ Conectado! PostgreSQL: {version[:50]}...")
        
        print("\n📊 Verificando tabelas existentes...")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY tablename;
            """))
            tables = [row[0] for row in result]
            print(f"   Tabelas encontradas: {len(tables)}")
            if tables:
                for table in tables:
                    print(f"   - {table}")
        
        print("\n🔨 Criando todas as tabelas com SQLAlchemy...")
        print(f"   Models registrados: {len(Base.metadata.tables)}")
        for table_name in Base.metadata.tables.keys():
            print(f"   - {table_name}")
        
        try:
            Base.metadata.create_all(bind=engine)
            print("   ✅ create_all() executado")
        except Exception as e:
            print(f"   ❌ ERRO no create_all(): {e}")
            import traceback
            traceback.print_exc()
            raise
        
        print("\n✅ Verificando tabelas criadas...")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY tablename;
            """))
            tables = [row[0] for row in result]
            print(f"   Total de tabelas: {len(tables)}")
            for table in tables:
                print(f"   ✓ {table}")
        
        print("\n🎉 SUCESSO! Todas as tabelas foram criadas!")
        return 0
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
