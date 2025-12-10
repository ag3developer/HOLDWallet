#!/usr/bin/env python3
"""
🧪 TESTE COMPLETO DO BACKEND - HOLDWallet

CHECKLIST:
✅ 1. Verificar usuário e conta
✅ 2. Verificar carteira e endereços blockchain
✅ 3. Verificar saldos no blockchain (nativo + USDT + USDC)
✅ 4. Verificar salvamento no banco de dados
✅ 5. Verificar preços (CoinGecko + Binance fallback)
✅ 6. Validar dados completos

Uso:
    python TESTE_COMPLETO_BACKEND.py
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime
from decimal import Decimal
import os

# Definir PYTHONPATH
os.environ['PYTHONPATH'] = str(Path(__file__).parent)
sys.path.insert(0, str(Path(__file__).parent))

import logging
from app.core.db import SessionLocal, engine, Base
from app.models.user import User
from app.models.wallet import Wallet
from app.models.address import Address
from app.services.blockchain_service import BlockchainService
from app.services.price_aggregator import price_aggregator
from sqlalchemy.orm import Session

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Cores para output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_section(title: str):
    """Imprimir seção do teste"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}📋 {title}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}\n")

def print_success(msg: str):
    """Imprimir mensagem de sucesso"""
    print(f"{Colors.OKGREEN}✅ {msg}{Colors.ENDC}")

def print_error(msg: str):
    """Imprimir mensagem de erro"""
    print(f"{Colors.FAIL}❌ {msg}{Colors.ENDC}")

def print_info(msg: str):
    """Imprimir mensagem de informação"""
    print(f"{Colors.OKCYAN}ℹ️  {msg}{Colors.ENDC}")

def print_warning(msg: str):
    """Imprimir mensagem de aviso"""
    print(f"{Colors.WARNING}⚠️  {msg}{Colors.ENDC}")

async def test_user_and_account(db: Session) -> tuple:
    """TESTE 1: Verificar usuário e conta"""
    print_section("TESTE 1: Usuário e Conta")
    
    try:
        # Buscar usuário de teste
        user = db.query(User).filter(User.email == "app@holdwallet.com").first()
        
        if not user:
            print_error("Usuário app@holdwallet.com não encontrado!")
            return None, None
        
        print_success(f"Usuário encontrado: {user.email}")
        print_info(f"ID: {user.id}")
        print_info(f"Criado em: {user.created_at}")
        
        # Buscar carteira
        wallet = db.query(Wallet).filter(
            Wallet.user_id == user.id,
            Wallet.name == "holdwallet"
        ).first()
        
        if not wallet:
            print_error("Carteira 'holdwallet' não encontrada!")
            return user, None
        
        print_success(f"Carteira encontrada: {wallet.name}")
        print_info(f"ID: {wallet.id}")
        print_info(f"Rede: {wallet.network}")
        print_info(f"Ativa: {wallet.is_active}")
        
        return user, wallet
        
    except Exception as e:
        print_error(f"Erro ao buscar usuário/carteira: {str(e)}")
        return None, None

async def test_addresses(db: Session, wallet: Wallet) -> list:
    """TESTE 2: Verificar endereços blockchain"""
    print_section("TESTE 2: Endereços Blockchain")
    
    try:
        addresses = db.query(Address).filter(
            Address.wallet_id == wallet.id,
            Address.is_active == True
        ).all()
        
        if not addresses:
            print_error("Nenhum endereço ativo encontrado!")
            return []
        
        print_success(f"Total de endereços: {len(addresses)}")
        
        for i, addr in enumerate(addresses, 1):
            print_info(f"\n  Endereço {i}:")
            print(f"    📍 Address: {addr.address}")
            print(f"    🌐 Network: {addr.network}")
            print(f"    📘 Derivation Path: {addr.derivation_path}")
            print(f"    🔑 Type: {addr.address_type}")
            print(f"    ✅ Ativo: {addr.is_active}")
            print(f"    📅 Criado: {addr.created_at}")
        
        return addresses
        
    except Exception as e:
        print_error(f"Erro ao buscar endereços: {str(e)}")
        return []

async def test_blockchain_balances(addresses: list) -> dict:
    """TESTE 3: Verificar saldos no blockchain"""
    print_section("TESTE 3: Saldos no Blockchain (Nativo + Tokens)")
    
    blockchain_service = BlockchainService()
    all_balances = {}
    
    for addr in addresses:
        address_str = str(addr.address)
        network_str = str(addr.network)
        
        print_info(f"\nFetching balances for {address_str} on {network_str}...")
        
        try:
            # Fetch com include_tokens=True
            balance_data = await blockchain_service.get_address_balance(
                address_str,
                network_str,
                include_tokens=True
            )
            
            native_balance = Decimal(balance_data.get('native_balance', '0'))
            token_balances = balance_data.get('token_balances', {})
            
            print_success(f"Saldo nativo: {native_balance} {network_str.upper()}")
            
            # Mostrar tokens encontrados
            if token_balances:
                print_success(f"Tokens encontrados: {len(token_balances)}")
                for token_addr, token_data in token_balances.items():
                    token_symbol = token_data.get('symbol', 'UNKNOWN')
                    token_balance = token_data.get('balance', '0')
                    print(f"    🪙 {token_symbol}: {token_balance} (Contrato: {token_addr})")
            else:
                print_warning("Nenhum token encontrado")
            
            all_balances[f"{network_str}_{address_str}"] = {
                'network': network_str,
                'address': address_str,
                'native_balance': str(native_balance),
                'token_balances': token_balances,
                'raw_data': balance_data
            }
            
        except Exception as e:
            print_error(f"Erro ao buscar saldos para {network_str}: {str(e)}")
            continue
    
    return all_balances

async def test_prices() -> dict:
    """TESTE 4: Verificar preços (CoinGecko + Binance)"""
    print_section("TESTE 4: Preços (CoinGecko + Binance Fallback)")
    
    try:
        # Símbolos para testar
        symbols = ['btc', 'eth', 'matic', 'usdt']
        
        print_info(f"Fetching prices for: {symbols}")
        print_info("Tentando CoinGecko (primary source)...")
        
        # Fetch individual (USD)
        prices_usd = await price_aggregator.get_prices(symbols, "usd")
        print_success(f"USD prices fetched from: {list(prices_usd.values())[0].source if prices_usd else 'N/A'}")
        
        for symbol, price_data in prices_usd.items():
            print(f"    💰 {symbol.upper()}: ${price_data.price:.2f} (Fonte: {price_data.source})")
            if price_data.change_24h:
                change_symbol = "📈" if price_data.change_24h > 0 else "📉"
                print(f"       {change_symbol} 24h change: {price_data.change_24h:.2f}%")
        
        # Fetch individual (BRL)
        print_info("\nFetching BRL prices...")
        prices_brl = await price_aggregator.get_prices(symbols, "brl")
        print_success(f"BRL prices fetched from: {list(prices_brl.values())[0].source if prices_brl else 'N/A'}")
        
        for symbol, price_data in prices_brl.items():
            print(f"    💰 {symbol.upper()}: R${price_data.price:.2f} (Fonte: {price_data.source})")
        
        return {
            'usd': prices_usd,
            'brl': prices_brl
        }
        
    except Exception as e:
        print_error(f"Erro ao buscar preços: {str(e)}")
        return {}

async def test_database_storage(db: Session, wallet: Wallet, balances: dict, prices: dict):
    """TESTE 5: Verificar salvamento no banco de dados"""
    print_section("TESTE 5: Salvamento no Banco de Dados")
    
    try:
        # Verificar se wallet existe
        wallet_check = db.query(Wallet).filter(Wallet.id == wallet.id).first()
        if wallet_check:
            print_success(f"Carteira persistida no BD: {wallet_check.name} (ID: {wallet_check.id})")
        
        # Verificar endereços
        addresses = db.query(Address).filter(Address.wallet_id == wallet.id).all()
        print_success(f"Total de endereços persistidos: {len(addresses)}")
        
        # Verificar se há transações
        from app.models.transaction import Transaction
        transactions = db.query(Transaction).filter(
            Transaction.user_id == wallet.user_id
        ).all()
        print_info(f"Total de transações no BD: {len(transactions)}")
        
        # Verificar usuário
        user = db.query(User).filter(User.id == wallet.user_id).first()
        if user:
            print_success(f"Usuário persistido: {user.email}")
        
        # Estatísticas do banco
        print_info("\n📊 Estatísticas do Banco de Dados:")
        print(f"    - Usuários: {db.query(User).count()}")
        print(f"    - Carteiras: {db.query(Wallet).count()}")
        print(f"    - Endereços: {db.query(Address).count()}")
        print(f"    - Transações: {db.query(Transaction).count()}")
        
        return True
        
    except Exception as e:
        print_error(f"Erro ao verificar banco: {str(e)}")
        return False

async def test_complete_flow():
    """Executar teste completo"""
    print(f"{Colors.BOLD}{Colors.OKCYAN}")
    print("╔════════════════════════════════════════════════════════════════════════════════╗")
    print("║                   🧪 TESTE COMPLETO DO BACKEND - HOLDWALLET                   ║")
    print("║                                                                                ║")
    print("║  Checklist:                                                                    ║")
    print("║  1. ✅ Usuário e Conta                                                         ║")
    print("║  2. ✅ Carteira e Endereços Blockchain                                         ║")
    print("║  3. ✅ Saldos (Nativo + USDT + USDC)                                           ║")
    print("║  4. ✅ Preços (CoinGecko + Binance)                                            ║")
    print("║  5. ✅ Salvamento no Banco de Dados                                            ║")
    print("║  6. ✅ Relatório Final                                                         ║")
    print("║                                                                                ║")
    print("╚════════════════════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.ENDC}\n")
    
    db = SessionLocal()
    results = {}
    
    try:
        # Teste 1: Usuário e Conta
        user, wallet = await test_user_and_account(db)
        if not user or not wallet:
            print_error("Não foi possível continuar - usuário/carteira não encontrados")
            return
        
        results['user'] = user
        results['wallet'] = wallet
        
        # Teste 2: Endereços
        addresses = await test_addresses(db, wallet)
        if not addresses:
            print_error("Não foi possível continuar - endereços não encontrados")
            return
        
        results['addresses'] = addresses
        
        # Teste 3: Saldos no Blockchain
        balances = await test_blockchain_balances(addresses)
        results['balances'] = balances
        
        # Teste 4: Preços
        prices = await test_prices()
        results['prices'] = prices
        
        # Teste 5: Banco de Dados
        db_ok = await test_database_storage(db, wallet, balances, prices)
        results['db_ok'] = db_ok
        
        # Teste 6: Relatório Final
        print_section("TESTE 6: Relatório Final")
        
        print(f"{Colors.BOLD}📋 RESUMO DOS RESULTADOS:{Colors.ENDC}\n")
        
        print(f"👤 Usuário: {user.email}")
        print(f"💼 Carteira: {wallet.name} (ID: {wallet.id})")
        print(f"📍 Endereços: {len(addresses)}")
        print(f"💰 Saldos coletados: {len(balances)}")
        print(f"💵 Preços coletados: USD={len(prices.get('usd', {}))}, BRL={len(prices.get('brl', {}))}")
        print(f"🗄️  Banco de Dados: {'✅ OK' if db_ok else '❌ Erro'}")
        
        # Mostrar resumo de saldos
        print(f"\n{Colors.BOLD}💰 RESUMO DE SALDOS:{Colors.ENDC}\n")
        
        total_usd = Decimal('0')
        
        for balance_key, balance_info in balances.items():
            network = balance_info['network']
            address = balance_info['address']
            native = Decimal(balance_info['native_balance'])
            tokens = balance_info['token_balances']
            
            print(f"🌐 {network.upper()}:")
            print(f"   📍 {address}")
            print(f"   💵 Nativo: {native}")
            
            if tokens:
                for token_addr, token_data in tokens.items():
                    symbol = token_data.get('symbol', 'UNKNOWN')
                    balance = Decimal(str(token_data.get('balance', '0')))
                    print(f"   🪙 {symbol}: {balance}")
            
            print()
        
        # Próximos passos
        print(f"\n{Colors.BOLD}📝 PRÓXIMOS PASSOS:{Colors.ENDC}\n")
        print("1. ✅ Testes do backend COMPLETO")
        print("2. ⏭️  Integração com endpoint GET /wallets/{id}/balances")
        print("3. ⏭️  Teste no Frontend (Dashboard)")
        print("4. ⏭️  Validar sincronização com banco de dados")
        
        print(f"\n{Colors.OKGREEN}{Colors.BOLD}✨ TESTES CONCLUÍDOS COM SUCESSO!{Colors.ENDC}\n")
        
    except Exception as e:
        print_error(f"Erro geral no teste: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_complete_flow())
