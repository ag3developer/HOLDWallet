#!/usr/bin/env python3
"""
🧪 TESTE SIMPLIFICADO - Verificar BD Diretamente
"""

import sqlite3
from pathlib import Path
from decimal import Decimal

DB_PATH = "/Users/josecarlosmartins/Documents/HOLDWallet/backend/holdwallet.db"

def print_section(title: str):
    print(f"\n{'='*80}")
    print(f"📋 {title}")
    print(f"{'='*80}\n")

def print_success(msg: str):
    print(f"✅ {msg}")

def print_info(msg: str):
    print(f"ℹ️  {msg}")

def test_database():
    """Testar banco de dados diretamente"""
    
    if not Path(DB_PATH).exists():
        print(f"❌ Banco de dados não encontrado: {DB_PATH}")
        return
    
    print_success(f"Banco de dados encontrado: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Teste 1: Usuários
        print_section("TESTE 1: Usuários")
        
        cursor.execute("SELECT * FROM users WHERE email='app@holdwallet.com'")
        user = cursor.fetchone()
        
        if user:
            print_success(f"Usuário encontrado: {user['email']}")
            print_info(f"ID: {user['id']}")
            print_info(f"Username: {user['username']}")
            print_info(f"Criado em: {user['created_at']}")
        else:
            print(f"❌ Usuário não encontrado")
            return
        
        user_id = user['id']
        
        # Teste 2: Carteiras
        print_section("TESTE 2: Carteiras")
        
        cursor.execute("SELECT * FROM wallets WHERE user_id=? AND name='holdwallet'", (user_id,))
        wallet = cursor.fetchone()
        
        if wallet:
            print_success(f"Carteira encontrada: {wallet['name']}")
            print_info(f"ID: {wallet['id']}")
            print_info(f"Rede: {wallet['network']}")
            print_info(f"Ativa: {wallet['is_active']}")
        else:
            print(f"❌ Carteira não encontrada")
            return
        
        wallet_id = wallet['id']
        
        # Teste 3: Endereços
        print_section("TESTE 3: Endereços Blockchain")
        
        cursor.execute(
            "SELECT * FROM addresses WHERE wallet_id=? AND is_active=1 ORDER BY network",
            (wallet_id,)
        )
        addresses = cursor.fetchall()
        
        if addresses:
            print_success(f"Total de endereços: {len(addresses)}")
            
            for i, addr in enumerate(addresses, 1):
                print(f"\n  📍 Endereço {i}:")
                print(f"     Address: {addr['address']}")
                print(f"     Network: {addr['network']}")
                print(f"     Derivation Path: {addr['derivation_path']}")
                print(f"     Type: {addr['address_type']}")
                print(f"     Ativo: {addr['is_active']}")
        else:
            print(f"❌ Nenhum endereço encontrado")
            return
        
        # Teste 4: Transações
        print_section("TESTE 4: Transações")
        
        cursor.execute(
            "SELECT COUNT(*) as total FROM transactions WHERE user_id=?",
            (user_id,)
        )
        tx_count = cursor.fetchone()
        print_info(f"Total de transações: {tx_count['total']}")
        
        # Mostrar últimas 5 transações
        if tx_count['total'] > 0:
            cursor.execute("""
                SELECT id, tx_hash, from_address, to_address, amount, network, status, created_at
                FROM transactions 
                WHERE user_id=? 
                ORDER BY created_at DESC 
                LIMIT 5
            """, (user_id,))
            
            transactions = cursor.fetchall()
            print_success(f"Últimas {len(transactions)} transações:")
            
            for tx in transactions:
                print(f"\n  📤 TX: {tx['tx_hash']}")
                print(f"     De: {tx['from_address']}")
                print(f"     Para: {tx['to_address']}")
                print(f"     Valor: {tx['amount']} {tx['network'].upper()}")
                print(f"     Status: {tx['status']}")
                print(f"     Data: {tx['created_at']}")
        
        # Teste 5: Estatísticas
        print_section("TESTE 5: Estatísticas do Banco")
        
        cursor.execute("SELECT COUNT(*) as total FROM users")
        users_count = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as total FROM wallets")
        wallets_count = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as total FROM addresses")
        addresses_count = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as total FROM transactions")
        transactions_count = cursor.fetchone()
        
        print(f"👥 Usuários: {users_count['total']}")
        print(f"💼 Carteiras: {wallets_count['total']}")
        print(f"📍 Endereços: {addresses_count['total']}")
        print(f"📤 Transações: {transactions_count['total']}")
        
        # Teste 6: Tabelas
        print_section("TESTE 6: Estrutura do Banco")
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print_info(f"Total de tabelas: {len(tables)}")
        print("\nTabelas encontradas:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) as total FROM {table['name']}")
            count = cursor.fetchone()
            print(f"  - {table['name']}: {count['total']} registros")
        
        print(f"\n✅ TESTES CONCLUÍDOS COM SUCESSO!\n")
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        conn.close()

if __name__ == "__main__":
    print("\n╔════════════════════════════════════════════════════════════════════════════════╗")
    print("║              🧪 TESTE SIMPLIFICADO DO BANCO DE DADOS - HOLDWALLET             ║")
    print("╚════════════════════════════════════════════════════════════════════════════════╝")
    
    test_database()
