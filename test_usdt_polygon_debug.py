#!/usr/bin/env python3
"""
Teste de busca de saldo USDT com debug detalhado
"""
import requests
import json
import logging

logging.basicConfig(level=logging.DEBUG)

API_BASE_URL = "http://127.0.0.1:8000"
USER_EMAIL = "app@holdwallet.com"
USER_PASSWORD = "Abc123@@"
WALLET_ID = "cdfd5281-483a-4f4b-ad70-290d65d2216d"

# Get token
login_response = requests.post(
    f"{API_BASE_URL}/auth/login",
    json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    }
)

token = login_response.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

print("=" * 70)
print("🧪 TESTE DE BUSCA DE SALDO USDT NA REDE POLYGON")
print("=" * 70)

print(f"\n📌 Endereço da carteira: 0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6")
print(f"📌 Rede: Polygon (Mumbai/Mainnet)")
print(f"📌 Contrato USDT Polygon: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F")

print("\n1️⃣ Testando endpoint com include_tokens=true")
response = requests.get(
    f"{API_BASE_URL}/wallets/{WALLET_ID}/balances?include_tokens=true",
    headers=headers
)

print(f"Status: {response.status_code}")
data = response.json()

print(f"\n📊 Saldos retornados:")
for key, bal in data.get('balances', {}).items():
    print(f"   {key}: {bal['balance']} (USD: {bal['balance_usd']})")

print(f"\n💡 Possíveis razões para não aparecerem tokens:")
print(f"   1. Endereço não tem saldo USDT na carteira")
print(f"   2. Backend está retornando mas sem saldo > 0")
print(f"   3. Chamada ao RPC está falhando silenciosamente")

# Testar se conseguimos acessar o RPC Polygon diretamente
print(f"\n2️⃣ Testando acesso direto ao RPC Polygon")
rpc_payload = {
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [
        {
            "to": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
            "data": "0x70a08231" + "a1aaacff9902bdaaebfbba53214bdce5d6f442e6".zfill(64)
        },
        "latest"
    ],
    "id": 1
}

rpc_response = requests.post(
    "https://polygon-rpc.com/",
    json=rpc_payload,
    timeout=10
)

print(f"RPC Status: {rpc_response.status_code}")
if rpc_response.status_code == 200:
    rpc_data = rpc_response.json()
    print(f"RPC Resposta: {json.dumps(rpc_data, indent=2)}")
    
    if "result" in rpc_data and rpc_data["result"] != "0x":
        balance_wei = int(rpc_data["result"], 16)
        balance_usdt = balance_wei / 10**6  # USDT tem 6 decimals
        print(f"\n✅ SALDO USDT ENCONTRADO: {balance_usdt} USDT")
    else:
        print(f"\n⚠️ Nenhum saldo USDT encontrado no endereço")
else:
    print(f"❌ Erro ao chamar RPC: {rpc_response.text}")

print("\n" + "=" * 70)
