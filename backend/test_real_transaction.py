#!/usr/bin/env python3
"""
🧪 Test Real Transaction - José Carlos
========================================
Testing transaction from app@holdwallet.com
Sending 1 MATIC to own address
"""

import requests
import json

BASE_URL = "http://localhost:8000"

# ANSI Colors
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
BOLD = '\033[1m'
END = '\033[0m'

def print_step(step: int, title: str):
    print(f"\n{CYAN}{BOLD}{'='*60}{END}")
    print(f"{CYAN}{BOLD}PASSO {step}: {title}{END}")
    print(f"{CYAN}{BOLD}{'='*60}{END}\n")

def print_success(msg: str):
    print(f"{GREEN}✅ {msg}{END}")

def print_error(msg: str):
    print(f"{RED}❌ {msg}{END}")

def print_info(msg: str):
    print(f"{CYAN}ℹ️  {msg}{END}")

def print_json(data):
    print(json.dumps(data, indent=2, ensure_ascii=False))

# User configuration
EMAIL = "app@holdwallet.com"
PASSWORD = "12345678"
TO_ADDRESS = "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6"
AMOUNT = "1"
NETWORK = "polygon"

print(f"{BOLD}{CYAN}")
print("╔══════════════════════════════════════════════════════════════╗")
print("║           🚀 TESTE DE TRANSAÇÃO REAL - POLYGON 🚀           ║")
print("║                                                              ║")
print(f"║  Usuário: {EMAIL:^44} ║")
print(f"║  Destino: {TO_ADDRESS[:42]:^44} ║")
print(f"║  Valor:   {AMOUNT + ' MATIC':^44} ║")
print("╚══════════════════════════════════════════════════════════════╝")
print(f"{END}\n")

# Step 1: Login
print_step(1, "AUTENTICAÇÃO")
print_info(f"Fazendo login com {EMAIL}...")

try:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": EMAIL, "password": PASSWORD}
    )
    
    if response.status_code != 200:
        print_error(f"Login falhou: {response.status_code}")
        print_json(response.json())
        exit(1)
    
    data = response.json()
    token = data.get("access_token")
    user_id = data.get("user", {}).get("id")
    
    print_success("Login realizado com sucesso!")
    print_info(f"User ID: {user_id}")
    print_info(f"Token: {token[:30]}...")
    
except Exception as e:
    print_error(f"Erro no login: {e}")
    exit(1)

# Step 2: Get Wallets
print_step(2, "BUSCAR CARTEIRAS")
print_info("Buscando carteiras do usuário...")

try:
    response = requests.get(
        f"{BASE_URL}/wallets",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code != 200:
        print_error(f"Erro ao buscar carteiras: {response.status_code}")
        print_json(response.json())
        exit(1)
    
    wallets = response.json()
    
    # Find Polygon wallet
    polygon_wallet = None
    for wallet in wallets:
        if wallet.get("network") == NETWORK:
            polygon_wallet = wallet
            break
    
    if not polygon_wallet:
        print_error(f"Nenhuma carteira {NETWORK.upper()} encontrada!")
        print_info(f"Carteiras disponíveis: {[w.get('network') for w in wallets]}")
        exit(1)
    
    wallet_id = str(polygon_wallet.get("id"))
    wallet_address = polygon_wallet.get("first_address")
    
    print_success(f"Carteira Polygon encontrada!")
    print_info(f"Wallet ID: {wallet_id}")
    print_info(f"Endereço: {wallet_address}")
    print_info(f"Total de carteiras: {len(wallets)}")
    
except Exception as e:
    print_error(f"Erro ao buscar carteiras: {e}")
    exit(1)

# Step 3: Validate Address
print_step(3, "VALIDAR ENDEREÇO DE DESTINO")
print_info(f"Validando endereço: {TO_ADDRESS}")

try:
    response = requests.post(
        f"{BASE_URL}/wallets/validate-address",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "address": TO_ADDRESS,
            "network": NETWORK
        }
    )
    
    if response.status_code != 200:
        print_error(f"Erro na validação: {response.status_code}")
        print_json(response.json())
        exit(1)
    
    result = response.json()
    
    if not result.get("valid"):
        print_error("❌ Endereço inválido!")
        print_json(result)
        exit(1)
    
    print_success("✅ Endereço válido para Polygon!")
    print_json(result)
    
except Exception as e:
    print_error(f"Erro na validação: {e}")
    exit(1)

# Step 4: Estimate Fees
print_step(4, "ESTIMAR TAXAS DE TRANSAÇÃO")
print_info(f"Estimando taxas para {AMOUNT} MATIC...")

try:
    response = requests.post(
        f"{BASE_URL}/wallets/estimate-fee",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "wallet_id": wallet_id,
            "to_address": TO_ADDRESS,
            "amount": AMOUNT,
            "network": NETWORK
        }
    )
    
    if response.status_code != 200:
        print_error(f"Erro na estimativa: {response.status_code}")
        print_json(response.json())
        exit(1)
    
    result = response.json()
    fee_estimates = result.get("fee_estimates", {})
    currency = result.get("currency", "MATIC")
    
    print_success("Taxas estimadas:")
    print(f"  🐌 Lento:    {fee_estimates.get('slow_fee', 'N/A')} {currency} (10-30 min)")
    print(f"  ⚡ Padrão:   {fee_estimates.get('standard_fee', 'N/A')} {currency} (2-10 min)")
    print(f"  🚀 Rápido:   {fee_estimates.get('fast_fee', 'N/A')} {currency} (<2 min)")
    
except Exception as e:
    print_error(f"Erro na estimativa: {e}")
    exit(1)

# Step 5: Send Transaction (CUSTODIAL MODE)
print_step(5, "ENVIAR TRANSAÇÃO (MODO CUSTODIAL)")

print(f"{YELLOW}{BOLD}")
print("⚠️  ATENÇÃO: Isso criará uma transação REAL na blockchain!")
print(f"⚠️  Será enviado {AMOUNT} MATIC para {TO_ADDRESS}")
print(f"{END}")

user_confirm = input(f"\n{BOLD}Confirma o envio? Digite 'SIM' para continuar: {END}").upper()

if user_confirm != 'SIM':
    print_info("Transação cancelada pelo usuário.")
    exit(0)

print_info(f"Enviando {AMOUNT} MATIC (modo custodial - backend assina)...")

try:
    response = requests.post(
        f"{BASE_URL}/wallets/send",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "wallet_id": wallet_id,
            "to_address": TO_ADDRESS,
            "amount": AMOUNT,
            "network": NETWORK,
            "fee_level": "standard",
            "mode": "custodial",  # Backend assina a transação
            "note": "Teste de transação - envio para mim mesmo"
        }
    )
    
    if response.status_code != 200:
        print_error(f"Erro ao enviar transação: {response.status_code}")
        print_json(response.json())
        exit(1)
    
    result = response.json()
    
    print(f"\n{GREEN}{BOLD}{'='*60}{END}")
    print(f"{GREEN}{BOLD}🎉 TRANSAÇÃO ENVIADA COM SUCESSO! 🎉{END}")
    print(f"{GREEN}{BOLD}{'='*60}{END}\n")
    
    print_info(f"Modo: {result.get('mode', 'N/A')}")
    print_info(f"TX Hash: {result.get('tx_hash', 'N/A')}")
    print_info(f"De: {result.get('from_address', 'N/A')}")
    print_info(f"Para: {result.get('to_address', 'N/A')}")
    print_info(f"Valor: {result.get('amount', 'N/A')} MATIC")
    print_info(f"Taxa: {result.get('fee', 'N/A')}")
    print_info(f"Status: {result.get('status', 'N/A')}")
    print_info(f"Tempo estimado: {result.get('estimated_confirmation_time', 'N/A')}")
    
    explorer_url = result.get('explorer_url', '')
    if explorer_url:
        print(f"\n{CYAN}{BOLD}🔍 Visualizar no Explorer:{END}")
        print(f"{CYAN}{explorer_url}{END}")
    
    print(f"\n{GREEN}{BOLD}✅ A transação foi assinada pelo backend e transmitida para a rede Polygon!{END}")
    print(f"{GREEN}✅ Aguarde alguns minutos para a confirmação na blockchain.{END}\n")
    
except Exception as e:
    print_error(f"Erro ao enviar transação: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print(f"{BOLD}{GREEN}{'='*60}{END}")
print(f"{BOLD}{GREEN}✨ TESTE CONCLUÍDO COM SUCESSO! ✨{END}")
print(f"{BOLD}{GREEN}{'='*60}{END}\n")
