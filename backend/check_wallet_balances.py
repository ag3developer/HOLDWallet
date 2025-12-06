#!/usr/bin/env python3
"""
Script para verificar saldos reais das carteiras na blockchain
"""
import sys
import os
import asyncio
from decimal import Decimal

# Adicionar o diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.models.wallet import Wallet
from app.models.address import Address
from app.services.blockchain_service import BlockchainService
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Usar SQLite
SQLITE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "holdwallet.db")
DATABASE_URL = f"sqlite:///{SQLITE_PATH}"

print(f"📁 Usando banco de dados: {SQLITE_PATH}")

# Criar engine e session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def check_balances():
    """Verifica saldos reais das carteiras"""
    db = SessionLocal()
    blockchain_service = BlockchainService()
    
    try:
        print("\n" + "="*80)
        print("💰 VERIFICANDO SALDOS DAS CARTEIRAS")
        print("="*80)
        
        # Buscar todos os usuários com suas carteiras
        users = db.query(User).all()
        
        for user in users:
            print(f"\n👤 Usuário: {user.email} (username: {user.username})")
            print(f"   ID: {user.id}")
            print("-" * 80)
            
            # Buscar carteiras do usuário
            wallets = db.query(Wallet).filter(Wallet.user_id == user.id).all()
            
            if not wallets:
                print("   ❌ Nenhuma carteira encontrada")
                continue
            
            for wallet in wallets:
                print(f"\n   💼 Carteira: {wallet.name}")
                print(f"      ID: {wallet.id}")
                print(f"      Rede: {wallet.network}")
                print(f"      Ativa: {wallet.is_active}")
                
                # Buscar endereços da carteira
                addresses = db.query(Address).filter(
                    Address.wallet_id == wallet.id,
                    Address.is_active == True
                ).all()
                
                if not addresses:
                    print("      ❌ Nenhum endereço ativo encontrado")
                    continue
                
                print(f"\n      🔑 Endereços e Saldos:")
                
                total_usd = Decimal('0')
                
                for addr in addresses:
                    print(f"\n      📍 {addr.network.upper()}:")
                    print(f"         Endereço: {addr.address}")
                    print(f"         Tipo: {addr.address_type}")
                    
                    try:
                        # Buscar saldo real na blockchain
                        balance_result = await blockchain_service.get_address_balance(
                            address=addr.address,
                            network=addr.network
                        )
                        
                        if balance_result:
                            print(f"         💵 Saldo: {balance_result}")
                            
                            # Tentar extrair valor numérico
                            if isinstance(balance_result, dict):
                                if 'balance' in balance_result:
                                    balance = balance_result['balance']
                                    balance_usd = balance_result.get('balance_usd', 0)
                                    print(f"         💰 {balance} (${balance_usd:.2f} USD)")
                                    total_usd += Decimal(str(balance_usd))
                                    
                                    # Listar tokens se houver
                                    if 'tokens' in balance_result and balance_result['tokens']:
                                        print(f"         🪙 Tokens:")
                                        for token in balance_result['tokens']:
                                            print(f"            - {token['symbol']}: {token['balance']} (${token.get('balance_usd', 0):.2f})")
                                            total_usd += Decimal(str(token.get('balance_usd', 0)))
                        else:
                            print(f"         ⚠️  Saldo: 0 ou não disponível")
                            
                    except Exception as e:
                        print(f"         ❌ Erro ao consultar saldo: {str(e)}")
                
                print(f"\n      💰 Total da carteira '{wallet.name}': ${total_usd:.2f} USD")
        
        print("\n" + "="*80)
        print("✅ Verificação concluída!")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔍 Verificando saldos das carteiras na blockchain...")
    asyncio.run(check_balances())
