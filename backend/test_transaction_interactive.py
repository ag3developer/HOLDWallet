#!/usr/bin/env python3
"""
Script interativo para testar transação com 2FA
Pede o código do autenticador do usuário
"""

import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_transaction():
    print("\n" + "=" * 70)
    print("🔐 TESTE INTERATIVO DE TRANSAÇÃO COM 2FA")
    print("=" * 70)
    
    # 1. Login
    print("\n[1/4] Fazendo login...")
    email = "app@holdwallet.com"
    password = "Abc123@@"
    
    login_response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    
    if login_response.status_code != 200:
        print(f"❌ Erro no login: {login_response.json()}")
        return
    
    token = login_response.json()['access_token']
    print(f"✅ Login bem-sucedido")
    print(f"   Token: {token[:50]}...")
    
    # 2. Pedir código 2FA
    print("\n[2/4] Digite o código do seu autenticador (6 dígitos):")
    two_fa_token = input(">>> ").strip()
    
    if not two_fa_token or len(two_fa_token) != 6:
        print("❌ Código inválido. Use 6 dígitos.")
        return
    
    print(f"✅ Código recebido: {two_fa_token}")
    
    # 3. Preparar payload da transação
    print("\n[3/4] Preparando transação...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "wallet_id": "cdfd5281-483a-4f4b-ad70-290d65d2216d",
        "to_address": "0x7913436c1B61575F66d31B6d5b77767A7dC30EFa",
        "amount": "5",
        "network": "polygon",
        "fee_level": "standard",
        "two_factor_token": two_fa_token
    }
    
    print(f"   Carteira: {payload['wallet_id']}")
    print(f"   Para: {payload['to_address']}")
    print(f"   Valor: {payload['amount']} MATIC")
    print(f"   2FA: {two_fa_token}")
    
    # 4. Enviar transação
    print("\n[4/4] Enviando transação...")
    
    response = requests.post(
        f"{BASE_URL}/wallets/send",
        json=payload,
        headers=headers
    )
    
    print(f"\n📊 RESPOSTA DO SERVIDOR:")
    print(f"   Status: {response.status_code}")
    print(f"   Body:")
    
    try:
        data = response.json()
        print(json.dumps(data, indent=2))
        
        if response.status_code == 200:
            print("\n✅ TRANSAÇÃO ENVIADA COM SUCESSO!")
            if 'txHash' in data:
                print(f"   TX Hash: {data['txHash']}")
            if 'transactionId' in data:
                print(f"   TX ID: {data['transactionId']}")
        else:
            print(f"\n❌ Erro ({response.status_code}): {data.get('message', data.get('detail', 'Desconhecido'))}")
    except:
        print(response.text)

if __name__ == "__main__":
    test_transaction()
