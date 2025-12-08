#!/usr/bin/env python3
"""
Script para testar o envio real de transação com as credenciais do usuário.
Conta: app@holdwallet.com
Senha: Abc123@@
Enviar: 5 MATIC para 0x7913436c1B61575F66d31B6d5b77767A7dC30EFa
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def login():
    """Faz login e retorna o token."""
    print("🔐 Fazendo login...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": "app@holdwallet.com",
            "password": "Abc123@@"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"✅ Login realizado com sucesso!")
        print(f"   Token: {token[:50]}...")
        return token
    else:
        print(f"❌ Erro no login: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def get_wallets(token):
    """Obtém as carteiras do usuário."""
    print("\n📦 Buscando carteiras...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/wallets", headers=headers)
    
    if response.status_code == 200:
        wallets = response.json()
        print(f"✅ Encontradas {len(wallets)} carteira(s)")
        
        # Exibir informações das carteiras
        for i, wallet in enumerate(wallets):
            print(f"\n   Carteira {i+1}:")
            print(f"   - ID: {wallet.get('id')}")
            print(f"   - Network: {wallet.get('network')}")
            print(f"   - Symbol: {wallet.get('symbol')}")
            print(f"   - First Address: {wallet.get('first_address', 'N/A')}")
        
        return wallets
    else:
        print(f"❌ Erro ao buscar carteiras: {response.status_code}")
        print(f"   Response: {response.text}")
        return []

def get_wallet_balance(token, wallet_id):
    """Obtém o saldo da carteira."""
    print(f"\n💰 Buscando saldo da carteira {wallet_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/wallets/{wallet_id}/balances", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Saldos obtidos:")
        print(json.dumps(data, indent=2))
        return data
    else:
        print(f"❌ Erro ao buscar saldo: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def validate_address(token, address, network):
    """Valida um endereço blockchain."""
    print(f"\n✔️  Validando endereço {address} na rede {network}...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/wallets/validate-address",
        headers=headers,
        json={
            "address": address,
            "network": network
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        if result.get("valid"):
            print(f"✅ Endereço válido!")
            return True
        else:
            print(f"❌ Endereço inválido!")
            return False
    else:
        print(f"❌ Erro na validação: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def estimate_fee(token, wallet_id, to_address, amount, network):
    """Estima taxas de transação."""
    print(f"\n📊 Estimando taxas para envio de {amount} {network}...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/wallets/estimate-fee",
        headers=headers,
        json={
            "wallet_id": wallet_id,
            "to_address": to_address,
            "amount": amount,
            "network": network
        }
    )
    
    if response.status_code == 200:
        fees = response.json()
        print(f"✅ Taxas estimadas:")
        print(json.dumps(fees, indent=2))
        return fees
    else:
        print(f"❌ Erro ao estimar taxas: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def send_transaction(token, wallet_id, to_address, amount, network, fee_level="standard", two_factor_token=None):
    """Envia uma transação."""
    print(f"\n🚀 Enviando transação...")
    print(f"   Wallet ID: {wallet_id}")
    print(f"   Para: {to_address}")
    print(f"   Valor: {amount} {network}")
    print(f"   Taxa: {fee_level}")
    if two_factor_token:
        print(f"   2FA Token: {'*' * (len(two_factor_token)-2) + two_factor_token[-2:]}")
    
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "wallet_id": wallet_id,
        "to_address": to_address,
        "amount": amount,
        "network": network,
        "fee_level": fee_level,
        "note": "Teste de envio via script"
    }
    
    if two_factor_token:
        payload["two_factor_token"] = two_factor_token
    
    print(f"\n   Payload: {json.dumps(payload, indent=2)}")
    
    response = requests.post(
        f"{BASE_URL}/wallets/send",
        headers=headers,
        json=payload
    )
    
    print(f"\n   Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Transação enviada com sucesso!")
        print(json.dumps(result, indent=2))
        return result
    else:
        print(f"\n❌ Erro ao enviar transação: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def main():
    print("=" * 70)
    print(" TESTE DE ENVIO DE TRANSAÇÃO POLYGON")
    print("=" * 70)
    print()
    
    # 1. Login
    token = login()
    if not token:
        print("\n❌ Falha ao fazer login. Abortar.")
        return
    
    # 2. Buscar carteiras
    wallets = get_wallets(token)
    if not wallets:
        print("\n❌ Nenhuma carteira encontrada. Abortar.")
        return
    
    # 3. Encontrar carteira Polygon ou Multi
    polygon_wallet = next((w for w in wallets if w.get("network") in ["polygon", "multi"]), None)
    if not polygon_wallet:
        print("\n❌ Nenhuma carteira Polygon/Multi encontrada. Abortar.")
        return
    
    wallet_id = polygon_wallet["id"]
    network_type = polygon_wallet.get("network", "unknown")
    print(f"\n✅ Carteira encontrada: {wallet_id} (network: {network_type})")
    
    # 4. Verificar saldo
    balances = get_wallet_balance(token, wallet_id)
    
    # 5. Parâmetros da transação
    to_address = "0x7913436c1B61575F66d31B6d5b77767A7dC30EFa"
    amount = "5"
    network = "polygon"
    
    # 6. Validar endereço
    if not validate_address(token, to_address, network):
        print("\n❌ Endereço inválido. Abortar.")
        return
    
    # 7. Estimar taxas
    fees = estimate_fee(token, wallet_id, to_address, amount, network)
    
    # 8. Enviar transação
    print("\n" + "=" * 70)
    print(" CONFIRMAÇÃO: Enviando transação real COM 2FA")
    print("=" * 70)
    
    # Use um dos tokens válidos gerados anteriormente
    two_fa_token = "491321"  # Você pode gerar novos tokens executando: python generate_2fa_token.py
    print(f"\n💡 Usando token 2FA: {two_fa_token}")
    print("   (Se expirado, execute: python generate_2fa_token.py para gerar novo token)")
    
    result = send_transaction(
        token=token,
        wallet_id=wallet_id,
        to_address=to_address,
        amount=amount,
        network=network,
        fee_level="standard",
        two_factor_token=two_fa_token
    )
    
    if result:
        transaction_id = result.get("transaction_id")
        tx_hash = result.get("tx_hash")
        print(f"\n✅ Transação criada com sucesso!")
        print(f"   Transaction ID: {transaction_id}")
        print(f"   TX Hash: {tx_hash}")
        
        # Mostrar link do explorador
        explorer_url = result.get("explorer_url")
        if explorer_url:
            print(f"   Explorer: {explorer_url}")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()
