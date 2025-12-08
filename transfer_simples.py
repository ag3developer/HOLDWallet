#!/usr/bin/env python3
"""
Script simples para transferir USDT via API do Backend
Usa o BANCO 1 (novo) que tem os dados sincronizados
"""

import requests
import json
from datetime import datetime

# Configuração
API_BASE = "http://127.0.0.1:8000"
EMAIL = "app@holdwallet.com"
PASSWORD = "Abc123@@"

# Endereços do seu teste
FROM_ADDRESS = "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6"
TO_ADDRESS = "0x7913436c1B61575F66d31B6d5b77767A7dC30EFa"

# Valores para testar
TRANSFERS = [
    {
        "network": "polygon",
        "amount": "0.5",
        "token": "USDT",
        "description": "Testando transfer de USDT em Polygon"
    },
    {
        "network": "base",
        "amount": "0.5",
        "token": "USDT",
        "description": "Testando transfer de USDT em BASE"
    }
]

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

print_header("TRANSFERÊNCIA DE USDT - VIA API")

print(f"""
╔════════════════════════════════════════════════════════════════════╗
║                    CONFIGURAÇÃO ATUAL                             ║
╚════════════════════════════════════════════════════════════════════╝

Email:          {EMAIL}
De:             {FROM_ADDRESS}
Para:           {TO_ADDRESS}
API:            {API_BASE}
Timestamp:      {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
""")

# 1. Login
print_header("PASSO 1: Fazer Login")

session = requests.Session()
login_url = f"{API_BASE}/auth/login"
login_data = {"email": EMAIL, "password": PASSWORD}

print_info(f"Conectando em: {login_url}")

try:
    response = session.post(login_url, json=login_data)
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('access_token')
        print_success("Login realizado!")
        print_info(f"Token: {token[:20]}...")
        session.headers.update({'Authorization': f'Bearer {token}'})
        
        # Obter ID da wallet
        user_id = data['user']['id']
        print_success(f"Usuário ID: {user_id}")
    else:
        print_error(f"Erro no login: {response.status_code}")
        print(response.json())
        exit()
except Exception as e:
    print_error(f"Exceção: {e}")
    exit()

# 2. Obter wallet
print_header("PASSO 2: Obter Wallet")

wallets_url = f"{API_BASE}/wallets"
print_info(f"Consultando: {wallets_url}")

try:
    response = session.get(wallets_url)
    
    if response.status_code == 200:
        wallets = response.json()
        if isinstance(wallets, list) and len(wallets) > 0:
            wallet = wallets[0]
            wallet_id = wallet.get('id')
            print_success(f"Wallet encontrada!")
            print_info(f"ID: {wallet_id}")
            print_info(f"Tipo: {wallet.get('type')}")
        else:
            print_error("Nenhuma wallet encontrada")
            exit()
    else:
        print_error(f"Erro: {response.status_code}")
        print(response.json())
        exit()
except Exception as e:
    print_error(f"Exceção: {e}")
    exit()

# 3. Verificar saldos
print_header("PASSO 3: Verificar Saldos")

try:
    response = session.get(f"{API_BASE}/wallets/{wallet_id}/balances")
    
    if response.status_code == 200:
        balances = response.json()
        print_success("Saldos carregados:")
        
        for balance in balances:
            crypto = balance.get('cryptocurrency', 'Unknown')
            total = balance.get('total_balance', 0)
            if total > 0:
                print_info(f"  💰 {crypto}: ${total:.6f}")
    else:
        print_error(f"Erro ao carregar saldos: {response.status_code}")
except Exception as e:
    print_error(f"Erro: {e}")

# 4. Listar opções de transferência
print_header("OPÇÕES DE TRANSFERÊNCIA")

print("\nEscolha qual transferência fazer:\n")
for i, transfer in enumerate(TRANSFERS, 1):
    print(f"{i}. {transfer['description']}")
    print(f"   Rede: {transfer['network']}")
    print(f"   Valor: {transfer['amount']} {transfer['token']}\n")

print(f"{len(TRANSFERS)+1}. Cancelar")

choice = input("Opção: ").strip()

if choice == str(len(TRANSFERS) + 1):
    print_info("Cancelado!")
    exit()

try:
    choice_idx = int(choice) - 1
    if choice_idx < 0 or choice_idx >= len(TRANSFERS):
        print_error("Opção inválida!")
        exit()
    
    transfer = TRANSFERS[choice_idx]
except ValueError:
    print_error("Entrada inválida!")
    exit()

# 5. Executar transferência
print_header("PASSO 4: Executar Transferência")

print(f"""
Você está prestes a fazer:

📤 De:       {FROM_ADDRESS}
📥 Para:     {TO_ADDRESS}
💰 Valor:    {transfer['amount']} {transfer['token']}
🌐 Rede:     {transfer['network'].upper()}
📝 Descrição: {transfer['description']}
""")

confirm = input("Confirma a transferência? (s/n): ").lower()

if confirm != 's':
    print_info("Transferência cancelada!")
    exit()

# Fazer transferência via API
send_url = f"{API_BASE}/wallets/send"
send_data = {
    "wallet_id": wallet_id,
    "to_address": TO_ADDRESS,
    "amount": transfer['amount'],
    "network": transfer['network'],
    "fee_level": "standard",
    "token_symbol": transfer['token']
}

print_info(f"Enviando requisição para: {send_url}")

try:
    response = session.post(send_url, json=send_data)
    
    if response.status_code == 200:
        tx_data = response.json()
        print_success("Transação enviada com sucesso!")
        
        print(f"""
╔════════════════════════════════════════════════════════════════════╗
║                      TRANSAÇÃO CONFIRMADA                         ║
╚════════════════════════════════════════════════════════════════════╝

Transaction ID:  {tx_data.get('transaction_id', 'N/A')}
TX Hash:         {tx_data.get('tx_hash', 'N/A')}
Status:          {tx_data.get('status', 'N/A')}
Valor:           {transfer['amount']} {transfer['token']}
Rede:            {transfer['network'].upper()}

Explorer Link:   {tx_data.get('explorer_url', 'N/A')}

⏱️  Tempo estimado: {tx_data.get('estimated_confirmation_time', 'N/A')}
""")
    else:
        print_error(f"Erro na transação: {response.status_code}")
        print_error(json.dumps(response.json(), indent=2))
except Exception as e:
    print_error(f"Exceção: {e}")

print("\n✨ Script finalizado!\n")
