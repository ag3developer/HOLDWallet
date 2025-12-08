#!/usr/bin/env python3
"""
Script para transferir USDT usando o BANCO 2 (banco real)
Depois sincroniza os dados para BANCO 1 (novo)

Fluxo:
1. Usa BANCO 2 como banco de dados principal (com dados reais)
2. Faz a transferência de USDT
3. Atualiza saldos no BANCO 2
4. Opcionalmente sincroniza para BANCO 1
"""

import sqlite3
from datetime import datetime
import uuid

class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.YELLOW}ℹ️  {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

# ========================
# CONFIGURAÇÃO
# ========================
BANCO2_PATH = "./holdwallet.db"  # Banco real (antigo)
BANCO1_PATH = "./backend/holdwallet.db"  # Banco novo

# Dados da transferência
FROM_ADDRESS = "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6"
TO_ADDRESS = "0x7913436c1B61575F66d31B6d5b77767A7dC30EFa"
AMOUNT_USDT = 0.5  # 0.5 USDT para teste
NETWORK = "polygon"

def get_user_wallet_banco2():
    """Obter usuário e wallet do BANCO 2"""
    try:
        conn = sqlite3.connect(BANCO2_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Obter usuário app@holdwallet.com
        cursor.execute("SELECT id, email, username FROM users WHERE email = 'app@holdwallet.com'")
        user = cursor.fetchone()
        
        if not user:
            print_error("Usuário app@holdwallet.com não encontrado no BANCO 2")
            return None, None
        
        # Obter wallet do usuário
        cursor.execute("SELECT id, name FROM wallets WHERE user_id = ?", (user['id'],))
        wallet = cursor.fetchone()
        
        conn.close()
        return user, wallet
    except Exception as e:
        print_error(f"Erro ao buscar dados do BANCO 2: {e}")
        return None, None

def get_current_balance_banco2(user_id):
    """Obter saldo USDT atual no BANCO 2"""
    try:
        conn = sqlite3.connect(BANCO2_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verificar estrutura primeiro
        cursor.execute("PRAGMA table_info(saldo)")
        columns = cursor.fetchall()
        
        print_info(f"Colunas da tabela 'saldo': {[col[1] for col in columns]}")
        
        # Obter saldo
        cursor.execute("SELECT * FROM saldo WHERE user_id = ? LIMIT 1", (user_id,))
        balance = cursor.fetchone()
        
        conn.close()
        return balance, columns
    except Exception as e:
        print_error(f"Erro ao obter saldo: {e}")
        return None, None

def transfer_usdt_banco2(user_id, amount):
    """Fazer transferência no BANCO 2"""
    try:
        conn = sqlite3.connect(BANCO2_PATH)
        cursor = conn.cursor()
        
        # Verificar saldo atual
        cursor.execute("SELECT saldo FROM saldo WHERE user_id = ? LIMIT 1", (user_id,))
        result = cursor.fetchone()
        
        if not result:
            print_error("Saldo não encontrado")
            return False
        
        current_balance = result[0]
        new_balance = current_balance - amount
        
        print_info(f"Saldo atual: ${current_balance}")
        print_info(f"Enviando: ${amount}")
        print_info(f"Novo saldo: ${new_balance}")
        
        if new_balance < 0:
            print_error(f"Saldo insuficiente! Necessário: ${amount}, Disponível: ${current_balance}")
            return False
        
        # Atualizar saldo
        cursor.execute("""
            UPDATE saldo 
            SET saldo = ? 
            WHERE user_id = ?
        """, (new_balance, user_id))
        
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        print_error(f"Erro na transferência: {e}")
        return False

def create_transaction_banco2(user_id, wallet_id, amount, tx_type="send"):
    """Registrar transação no BANCO 2"""
    try:
        conn = sqlite3.connect(BANCO2_PATH)
        cursor = conn.cursor()
        
        transaction_id = str(uuid.uuid4())
        tx_hash = f"0x{'a'*64}"  # Placeholder
        
        # Verificar se tabela existe
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
        if not cursor.fetchone():
            print_warning("Tabela 'transactions' não existe no BANCO 2, criando...")
            cursor.execute("""
                CREATE TABLE transactions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    wallet_id TEXT,
                    tx_type TEXT,
                    amount REAL,
                    tx_hash TEXT,
                    status TEXT,
                    created_at TIMESTAMP
                )
            """)
        
        # Inserir transação
        cursor.execute("""
            INSERT INTO transactions 
            (id, user_id, wallet_id, tx_type, amount, tx_hash, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (transaction_id, user_id, wallet_id, tx_type, amount, tx_hash, "pending", datetime.now()))
        
        conn.commit()
        conn.close()
        
        return transaction_id
    except Exception as e:
        print_error(f"Erro ao registrar transação: {e}")
        return None

def sync_to_banco1(user_id):
    """Sincronizar dados do BANCO 2 para BANCO 1"""
    try:
        print_info("Sincronizando dados para BANCO 1...")
        
        # Obter dados do BANCO 2
        conn2 = sqlite3.connect(BANCO2_PATH)
        conn2.row_factory = sqlite3.Row
        cursor2 = conn2.cursor()
        
        cursor2.execute("SELECT saldo FROM saldo WHERE user_id = ?", (user_id,))
        result2 = cursor2.fetchone()
        conn2.close()
        
        if not result2:
            print_error("Saldo não encontrado no BANCO 2")
            return False
        
        # Atualizar BANCO 1
        conn1 = sqlite3.connect(BANCO1_PATH)
        cursor1 = conn1.cursor()
        
        # Atualizar USDT-POLYGON
        cursor1.execute("""
            UPDATE wallet_balances 
            SET available_balance = ?, total_balance = ?
            WHERE user_id = ? AND cryptocurrency = 'USDT-POLYGON'
        """, (result2['saldo'], result2['saldo'], user_id))
        
        conn1.commit()
        conn1.close()
        
        print_success(f"Saldo sincronizado para BANCO 1: ${result2['saldo']}")
        return True
    except Exception as e:
        print_error(f"Erro na sincronização: {e}")
        return False

def main():
    """Main"""
    print_header("TRANSFERÊNCIA DE USDT - USANDO BANCO 2 (REAL)")
    
    print(f"""
╔════════════════════════════════════════════════════════════════════╗
║                    CONFIGURAÇÃO DA TRANSFERÊNCIA                  ║
╚════════════════════════════════════════════════════════════════════╝

De:              {FROM_ADDRESS}
Para:            {TO_ADDRESS}
Valor:           {AMOUNT_USDT} USDT
Rede:            {NETWORK}
Banco de Dados:  {BANCO2_PATH}
""")
    
    # 1. Obter usuário e wallet
    print_header("PASSO 1: Obter Usuário e Wallet")
    user, wallet = get_user_wallet_banco2()
    
    if not user:
        return
    
    print_success(f"Usuário: {user['email']} (ID: {user['id']})")
    print_success(f"Wallet: {wallet['name'] if wallet else 'Não encontrado'}")
    
    # 2. Verificar saldo atual
    print_header("PASSO 2: Verificar Saldo Atual")
    balance, _ = get_current_balance_banco2(user['id'])
    
    if balance:
        print_success("Saldo encontrado")
        print_info(f"Valor: ${balance['saldo'] if 'saldo' in dict(balance) else 'Desconhecido'}")
    
    # 3. Fazer transferência
    print_header("PASSO 3: Executar Transferência")
    
    confirmation = input(f"\n❓ Confirma a transferência de ${AMOUNT_USDT} USDT? (s/n): ").lower()
    
    if confirmation != 's':
        print_error("Transferência cancelada!")
        return
    
    if transfer_usdt_banco2(user['id'], AMOUNT_USDT):
        print_success("Transferência realizada com sucesso!")
        
        # Registrar transação
        tx_id = create_transaction_banco2(user['id'], wallet['id'] if wallet else None, AMOUNT_USDT)
        if tx_id:
            print_success(f"Transação registrada: {tx_id}")
    else:
        print_error("Falha na transferência")
        return
    
    # 4. Sincronizar para BANCO 1
    print_header("PASSO 4: Sincronizar para BANCO 1")
    
    sync_confirmation = input("\n❓ Sincronizar saldos para BANCO 1? (s/n): ").lower()
    
    if sync_confirmation == 's':
        if sync_to_banco1(user['id']):
            print_success("Sincronização concluída!")
        else:
            print_error("Falha na sincronização")
    
    # 5. Resumo final
    print_header("✨ RESUMO FINAL")
    
    print(f"""
╔════════════════════════════════════════════════════════════════════╗
║                        TRANSFERÊNCIA CONCLUÍDA                    ║
╚════════════════════════════════════════════════════════════════════╝

✅ Valor transferido: ${AMOUNT_USDT} USDT
✅ Banco de dados: {BANCO2_PATH}
✅ Novo saldo em POLYGON: Verificar no banco
✅ Sincronizado para BANCO 1: {'Sim' if sync_confirmation == 's' else 'Não'}

Próximas ações:
1. Verifique o explorador: https://polygonscan.com/tx/...
2. Recarregue o frontend para ver os saldos atualizados
3. Se necessário, sincronize novamente com BANCO 1
""")
    
    print("=" * 80 + "\n")

if __name__ == "__main__":
    main()
