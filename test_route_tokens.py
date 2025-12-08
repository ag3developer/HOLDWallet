#!/usr/bin/env python3
"""
Teste detalhado de qual rota está sendo usada
"""
import requests
import json

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

print("=" * 60)
print("TESTANDO /wallets/{id}/balances COM include_tokens=true")
print("=" * 60)

response = requests.get(
    f"{API_BASE_URL}/wallets/{WALLET_ID}/balances?include_tokens=true",
    headers=headers
)

print(f"\nStatus: {response.status_code}")
print(f"\nResposta:")
print(json.dumps(response.json(), indent=2))

# Procurar tokens
data = response.json()
token_keys = [k for k in data.get('balances', {}).keys() if 'usdt' in k.lower() or 'usdc' in k.lower()]
print(f"\n🔍 Chaves com tokens: {token_keys}")
