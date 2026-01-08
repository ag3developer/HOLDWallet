"""
Script para verificar a carteira do sistema no banco de dados
"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv('backend/.env')

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/holdwallet')

print(f"🔗 Conectando ao banco...")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Verificar SystemBlockchainWallet
print("\n🏦 Verificando SystemBlockchainWallet...")
try:
    result = session.execute(text("SELECT id, name, wallet_type, is_active, is_locked, created_at FROM system_blockchain_wallets")).fetchall()
    if result:
        print(f"  ✅ Encontradas {len(result)} carteiras do sistema:")
        for row in result:
            print(f"     - ID: {row[0]}")
            print(f"       Nome: {row[1]}")
            print(f"       Tipo: {row[2]}")
            print(f"       Ativa: {row[3]}")
            print(f"       Bloqueada: {row[4]}")
            print(f"       Criada em: {row[5]}")
    else:
        print("  ⚠️ NENHUMA carteira do sistema encontrada no banco!")
        print("  💡 Você precisa criar a carteira do sistema pelo painel admin")
except Exception as e:
    print(f"  ❌ Erro: {e}")

# Verificar SystemBlockchainAddress
print("\n📬 Verificando SystemBlockchainAddress...")
try:
    result = session.execute(text("""
        SELECT id, address, network, cached_balance, cached_usdt_balance, cached_usdc_balance, cached_balance_updated_at
        FROM system_blockchain_addresses
        ORDER BY network
    """)).fetchall()
    if result:
        print(f"  ✅ Encontrados {len(result)} endereços do sistema:")
        for row in result:
            print(f"     [{row[2].upper()}] {row[1]}")
            print(f"       Saldo nativo: {row[3]}")
            print(f"       USDT: {row[4]}")
            print(f"       USDC: {row[5]}")
            print(f"       Última atualização: {row[6]}")
            print()
    else:
        print("  ⚠️ NENHUM endereço do sistema encontrado!")
except Exception as e:
    print(f"  ❌ Erro: {e}")

session.close()
print("\n✅ Verificação concluída!")
